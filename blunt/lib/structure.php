<?php
declare(strict_types=1);

/**
 * Repeat blocks (Thick): a container's children are cut into chunks — each child plus the whitespace before it —
 * and put back in a new order, with copies and without deleted ones. Only whitespace may sit between children.
 */

/** Byte offset just past an element's end tag (or its start tag, for void elements), or null. */
function blunt_outer_end(string $html, array $tags, int $index): ?int
{
    $tag = $tags[$index];
    if ($tag['selfClosing'] || in_array($tag['name'], BLUNT_VOID_TAGS, true)) {
        return $tag['end'];
    }
    $range = blunt_content_range($html, $tags, $index);
    if ($range === null || preg_match('#</' . preg_quote($tag['name'], '#') . '\s*>#iA', $html, $m, 0, $range['end']) !== 1) {
        return null;
    }
    return $range['end'] + strlen($m[0]);
}

/** A container's direct children: ['chunks' => [tag index => [start, end]], 'start' => ..., 'end' => ...]. Throws if text or comments sit between them. */
function blunt_child_chunks(string $html, array $tags, int $parent): array
{
    $range = blunt_content_range($html, $tags, $parent);
    if ($range === null) {
        throw new BluntError("Can't find where that container ends in the file.");
    }
    $notJustSpace = fn (string $s) => trim($s) !== '';
    $chunks = [];
    $pos = $range['start'];
    for ($i = $parent + 1, $count = count($tags); $i < $count && $tags[$i]['start'] < $range['end']; $i++) {
        if ($tags[$i]['start'] < $pos) {
            continue; // inside the previous child
        }
        $end = blunt_outer_end($html, $tags, $i);
        if ($notJustSpace(substr($html, $pos, $tags[$i]['start'] - $pos)) || $end === null || $end > $range['end']) {
            throw new BluntError("This container has text or comments between its items, so they can't be rearranged.");
        }
        $chunks[$i] = [$pos, $end];
        $pos = $end;
    }
    if ($notJustSpace(substr($html, $pos, $range['end'] - $pos))) {
        throw new BluntError("This container has text or comments between its items, so they can't be rearranged.");
    }
    return ['chunks' => $chunks, 'start' => $range['start'], 'end' => $pos];
}

/** Where an offset in the original file ends up after $edits were applied. Offsets never fall inside an edit. */
function blunt_map_offset(array $edits, int $offset): int
{
    $shift = 0;
    foreach ($edits as [$start, $end, $replacement]) {
        if ($start < $offset && $offset < $end) {
            throw new BluntError('Two changes touch the same part of the file.');
        }
        if ($end <= $offset && $start < $offset) {
            $shift += strlen($replacement) - ($end - $start);
        }
    }
    return $offset + $shift;
}

/** Gives every data-blunt name in a copied chunk a free "-2", "-3"… name. $taken collects the names in use. */
function blunt_rename_copy(string $chunk, array &$taken): string
{
    $edits = [];
    foreach (blunt_scan($chunk) as $tag) {
        $name = blunt_attr_value($chunk, blunt_attr($tag, 'data-blunt'));
        if ($name === null || $name === '') {
            continue;
        }
        for ($n = 2; isset($taken["$name-$n"]); $n++);
        $taken["$name-$n"] = true;
        $edits[] = blunt_set_attr_edit($chunk, $tag, 'data-blunt', "$name-$n");
    }
    return blunt_apply_edits($chunk, $edits);
}

/**
 * Rebuilds each container in $orders (parent index => items) on top of $newHtml, which is $html with $edits applied.
 * An item is ['id' => child index] (kept, in this order) or ['copy' => child index]. Children not listed are removed.
 */
function blunt_apply_orders(string $html, array $tags, array $edits, string $newHtml, array $orders): string
{
    $taken = array_fill_keys(array_map('strval', array_keys(blunt_named($newHtml, blunt_scan($newHtml)))), true);
    $regions = [];
    foreach ($orders as $parent => $items) {
        $c = blunt_child_chunks($html, $tags, $parent);
        $piece = function (int $id) use ($c, $edits, $newHtml): string {
            if (!isset($c['chunks'][$id])) {
                throw new BluntError("Item $id is not a child of that container.");
            }
            [$start, $end] = $c['chunks'][$id];
            $from = blunt_map_offset($edits, $start);
            return substr($newHtml, $from, blunt_map_offset($edits, $end) - $from);
        };
        $out = '';
        $seen = [];
        foreach ($items as $item) {
            if (isset($item['id'])) {
                if (isset($seen[$item['id']])) {
                    throw new BluntError('An item is listed twice in one container.');
                }
                $seen[$item['id']] = true;
                $out .= $piece($item['id']);
            } else {
                $out .= blunt_rename_copy($piece($item['copy']), $taken);
            }
        }
        $regions[] = [blunt_map_offset($edits, $c['start']), blunt_map_offset($edits, $c['end']), $out];
    }
    return blunt_apply_edits($newHtml, $regions);
}
