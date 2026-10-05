<?php
declare(strict_types=1);

/**
 * Validates every change, then applies them all. Returns ['html' => ..., 'css' => ...].
 * Throws BluntError on the first invalid change; nothing is partially applied.
 * $tier decides which style properties are allowed (see blunt_style_props).
 */
function blunt_apply_changes(string $html, ?string $css, array $changes, string $tier = 'light'): array
{
    $tags = blunt_scan($html);
    $named = blunt_named($html, $tags);
    $edits = [];
    $styles = [];
    $tokens = [];
    $orders = [];

    foreach ($changes as $i => $change) {
        $n = (int) $i + 1;
        if (!is_array($change)) {
            throw new BluntError("Change $n is malformed.");
        }
        $type = $change['type'] ?? '';
        switch ($type) {
            case 'text':
            case 'href':
            case 'rich':
                $name = (string) ($change['name'] ?? '');
                $value = $change['value'] ?? null;
                if ($type === 'rich' && $tier !== 'thick') {
                    throw new BluntError('Formatted text is not allowed in this edition.');
                }
                if ($type === 'rich' ? !is_array($value) : !is_string($value)) {
                    throw new BluntError($value === null ? "Change $n has no value." : "Change $n is malformed.");
                }
                $ids = $named[$name] ?? [];
                if ($ids === []) {
                    throw new BluntError("No block named \"$name\" on this page.");
                }
                if (count($ids) > 1) {
                    throw new BluntError("The name \"$name\" is used more than once on this page.");
                }
                $tag = $tags[$ids[0]];
                if ($type === 'rich') {
                    $range = blunt_content_range($html, $tags, $tag['index']);
                    if ($range === null) {
                        throw new BluntError("Can't find where \"$name\" ends in the file.");
                    }
                    if (!blunt_rich_editable(substr($html, $range['start'], $range['end'] - $range['start']))) {
                        throw new BluntError("\"$name\" contains HTML that can't be edited here.");
                    }
                    $edits[] = [$range['start'], $range['end'], blunt_rich_html($value)];
                } elseif ($type === 'text') {
                    if (!blunt_valid_text($value)) {
                        throw new BluntError("The text for \"$name\" is too long or not valid text.");
                    }
                    $range = blunt_content_range($html, $tags, $tag['index']);
                    if ($range === null) {
                        throw new BluntError("Can't find where \"$name\" ends in the file.");
                    }
                    if (str_contains(substr($html, $range['start'], $range['end'] - $range['start']), '<')) {
                        throw new BluntError("\"$name\" contains HTML tags and can't be edited as plain text.");
                    }
                    $edits[] = [$range['start'], $range['end'], htmlspecialchars($value, ENT_NOQUOTES | ENT_HTML5, 'UTF-8')];
                } else {
                    if ($tag['name'] !== 'a') {
                        throw new BluntError("\"$name\" is not a link.");
                    }
                    if (!blunt_valid_href($value)) {
                        throw new BluntError('That link address is not allowed.');
                    }
                    $edits[] = blunt_set_attr_edit($html, $tag, 'href', trim($value));
                }
                break;

            case 'style':
                $id = $change['id'] ?? null;
                if (!is_int($id) || !isset($tags[$id])) {
                    throw new BluntError("Change $n points at an element that doesn't exist.");
                }
                $set = $change['set'] ?? [];
                $unset = $change['unset'] ?? [];
                if (!is_array($set) || !is_array($unset)) {
                    throw new BluntError("Change $n is malformed.");
                }
                foreach ($set as $prop => $value) {
                    if (!is_string($value) || !blunt_valid_style((string) $prop, $value, $tier)) {
                        throw new BluntError("The style \"$prop\" with that value is not allowed.");
                    }
                    $styles[$id]['set'][(string) $prop] = $value;
                }
                foreach ($unset as $prop) {
                    if (!is_string($prop) || !in_array($prop, blunt_style_props($tier), true)) {
                        throw new BluntError('Removing that style is not allowed.');
                    }
                    $styles[$id]['unset'][] = $prop;
                }
                break;

            case 'attr':
                // Thick: an image's src, alt and size attributes.
                $id = $change['id'] ?? null;
                $attr = (string) ($change['name'] ?? '');
                $value = $change['value'] ?? null;
                if (!is_int($id) || !isset($tags[$id])) {
                    throw new BluntError("Change $n points at an element that doesn't exist.");
                }
                $tag = $tags[$id];
                if ($tier !== 'thick' || !is_string($value) || !in_array($attr, ['src', 'alt', 'width', 'height'], true)) {
                    throw new BluntError("Changing the \"$attr\" attribute is not allowed.");
                }
                if ($tag['name'] !== 'img') {
                    throw new BluntError('Image changes work only on images.');
                }
                if ($attr === 'src' && blunt_attr($tag, 'srcset') !== null) {
                    throw new BluntError("This image uses srcset, so replacing its src alone wouldn't show.");
                }
                $ok = match ($attr) {
                    'src' => blunt_valid_image_url($value),
                    'alt' => strlen($value) <= 1000 && blunt_valid_text($value),
                    default => preg_match('/^\d{1,5}$/', $value) === 1,
                };
                if (!$ok) {
                    throw new BluntError("That value for \"$attr\" is not allowed.");
                }
                $edits[] = blunt_set_attr_edit($html, $tag, $attr, $attr === 'alt' ? $value : trim($value));
                break;

            case 'order':
                // Thick: a container's children in their new order, with copies; children left out are removed.
                $parent = $change['parent'] ?? null;
                $items = $change['items'] ?? null;
                if ($tier !== 'thick') {
                    throw new BluntError('Rearranging blocks is not allowed in this edition.');
                }
                if (!is_int($parent) || !isset($tags[$parent])) {
                    throw new BluntError("Change $n points at an element that doesn't exist.");
                }
                if (!is_array($items) || !array_is_list($items)) {
                    throw new BluntError("Change $n is malformed.");
                }
                foreach ($items as $item) {
                    $ok = is_array($item) && count($item) === 1
                        && ((isset($item['id']) && is_int($item['id'])) || (isset($item['copy']) && is_int($item['copy'])));
                    if (!$ok) {
                        throw new BluntError("Change $n is malformed.");
                    }
                }
                if (isset($orders[$parent])) {
                    throw new BluntError('The same container is rearranged twice in one save.');
                }
                $orders[$parent] = $items;
                break;

            case 'token':
                if ($css === null) {
                    throw new BluntError('No token file is set up.');
                }
                $name = (string) ($change['name'] ?? '');
                $value = $change['value'] ?? null;
                if (!blunt_valid_token_name($name) || !is_string($value) || !blunt_valid_token_value($value)) {
                    throw new BluntError("The value for token $name is not allowed.");
                }
                $tokens[$name] = $value;
                break;

            default:
                throw new BluntError("Change $n has an unknown type.");
        }
    }

    foreach ($styles as $id => $style) {
        $edit = blunt_style_edit($html, $tags[$id], $style['set'] ?? [], $style['unset'] ?? []);
        if ($edit !== null) {
            $edits[] = $edit;
        }
    }
    $newHtml = blunt_apply_edits($html, $edits);
    if ($orders !== []) {
        $newHtml = blunt_apply_orders($html, $tags, $edits, $newHtml, $orders);
    }
    foreach ($tokens as $name => $value) {
        $css = blunt_set_token((string) $css, $name, $value);
    }
    return ['html' => $newHtml, 'css' => $css];
}
