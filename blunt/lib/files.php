<?php
declare(strict_types=1);

/** Writes to a temp file next to $file, then renames it over $file. */
function blunt_write_atomic(string $file, string $content): void
{
    $tmp = $file . '.blunt-tmp';
    if (file_put_contents($tmp, $content, LOCK_EX) === false) {
        throw new BluntError('Could not write the file. Check folder permissions.', 500);
    }
    if (!rename($tmp, $file)) {
        @unlink($tmp);
        throw new BluntError('Could not replace the file. Check folder permissions.', 500);
    }
}

/** Copies $file into $dir as <slug>.<timestamp>.bak and keeps only the newest $keep per file. */
function blunt_backup(string $file, string $root, string $dir, int $keep = 10): void
{
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new BluntError('Could not create the backups folder.', 500);
    }
    $slug = blunt_backup_slug(blunt_relpath($root, (string) realpath($file)));
    $stamp = (new DateTimeImmutable())->format('Ymd-His-u');
    $target = "$dir/$slug.$stamp.bak";
    for ($n = 1; file_exists($target); $n++) {
        $target = "$dir/$slug.$stamp-$n.bak";
    }
    if (!copy($file, $target)) {
        throw new BluntError('Could not write a backup. Nothing was saved.', 500);
    }
    $all = glob("$dir/$slug.*.bak") ?: [];
    sort($all);
    foreach (array_slice($all, 0, max(0, count($all) - $keep)) as $old) {
        @unlink($old);
    }
}
