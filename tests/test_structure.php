<?php
declare(strict_types=1);

const LIST_PAGE = "<ul class=\"x\">\n  <li data-blunt=\"a\">A</li>\n  <li data-blunt=\"b\">B</li>\n  <li data-blunt=\"c\">C</li>\n</ul>";

function order(array $items, int $parent = 0): array
{
    return ['type' => 'order', 'parent' => $parent, 'items' => $items];
}

function apply_list(array $changes, string $html = LIST_PAGE): string
{
    return blunt_apply_changes($html, null, $changes, 'thick')['html'];
}

function test_structure_reorders_keeping_indentation(): void
{
    assert_same("<ul class=\"x\">\n  <li data-blunt=\"c\">C</li>\n  <li data-blunt=\"a\">A</li>\n  <li data-blunt=\"b\">B</li>\n</ul>",
        apply_list([order([['id' => 3], ['id' => 1], ['id' => 2]])]));
}

function test_structure_deletes_whole_lines(): void
{
    assert_same("<ul class=\"x\">\n  <li data-blunt=\"a\">A</li>\n  <li data-blunt=\"c\">C</li>\n</ul>", apply_list([order([['id' => 1], ['id' => 3]])]));
    assert_same("<ul class=\"x\">\n</ul>", apply_list([order([])]));
}

function test_structure_duplicates_with_fresh_names(): void
{
    assert_same("<ul class=\"x\">\n  <li data-blunt=\"a\">A</li>\n  <li data-blunt=\"a-2\">A</li>\n  <li data-blunt=\"a-3\">A</li>\n  <li data-blunt=\"b\">B</li>\n  <li data-blunt=\"c\">C</li>\n</ul>",
        apply_list([order([['id' => 1], ['copy' => 1], ['copy' => 1], ['id' => 2], ['id' => 3]])]));
    // a-2 already exists on the page, so the copy skips to a-3
    $html = str_replace('data-blunt="c"', 'data-blunt="a-2"', LIST_PAGE);
    assert_true(str_contains(apply_list([order([['id' => 1], ['copy' => 1], ['id' => 2], ['id' => 3]])], $html), '<li data-blunt="a-3">A</li>'));
}

function test_structure_copies_nested_names_and_unnamed_items(): void
{
    $html = "<section>\n  <article class=\"card\"><h2 data-blunt=\"t1\">One</h2><p data-blunt=\"p1\">x</p></article>\n  <article class=\"card\"><h2>Two</h2></article>\n</section>";
    $out = apply_list([order([['id' => 1], ['copy' => 1], ['id' => 4], ['copy' => 4]])], $html);
    assert_same("<section>\n  <article class=\"card\"><h2 data-blunt=\"t1\">One</h2><p data-blunt=\"p1\">x</p></article>\n  <article class=\"card\"><h2 data-blunt=\"t1-2\">One</h2><p data-blunt=\"p1-2\">x</p></article>\n  <article class=\"card\"><h2>Two</h2></article>\n  <article class=\"card\"><h2>Two</h2></article>\n</section>", $out);
}

function test_structure_keeps_other_edits_from_the_same_save(): void
{
    $out = apply_list([
        ['type' => 'text', 'name' => 'b', 'value' => 'Bee'],
        ['type' => 'style', 'id' => 0, 'set' => ['gap' => '8px']],
        ['type' => 'style', 'id' => 3, 'set' => ['color' => '#123456']],
        ['type' => 'rich', 'name' => 'a', 'value' => [['tag' => 'b', 'children' => ['A']]]],
        order([['id' => 2], ['copy' => 2], ['id' => 3], ['id' => 1]]),
    ]);
    assert_same("<ul class=\"x\" style=\"gap: 8px\">\n  <li data-blunt=\"b\">Bee</li>\n  <li data-blunt=\"b-2\">Bee</li>\n  <li data-blunt=\"c\" style=\"color: #123456\">C</li>\n  <li data-blunt=\"a\"><b>A</b></li>\n</ul>", $out);
}

function test_structure_handles_void_items(): void
{
    $html = "<div class=\"g\">\n  <img src=\"1.jpg\">\n  <img src=\"2.jpg\">\n</div>";
    assert_same("<div class=\"g\">\n  <img src=\"2.jpg\">\n  <img src=\"1.jpg\">\n  <img src=\"1.jpg\">\n</div>", apply_list([order([['id' => 2], ['id' => 1], ['copy' => 1]])], $html));
}

function test_structure_changes_are_checked(): void
{
    assert_throws(fn () => blunt_apply_changes(LIST_PAGE, null, [order([['id' => 1]])]), 'not allowed');
    assert_throws(fn () => apply_list([order([['id' => 1], ['id' => 1]])]), 'twice');
    assert_throws(fn () => apply_list([order([['id' => 0]])]), 'not a child');
    assert_throws(fn () => apply_list([order([['copy' => 9]])]), 'not a child');
    assert_throws(fn () => apply_list([order([['id' => 1]], 9)]), "doesn't exist");
    assert_throws(fn () => apply_list([['type' => 'order', 'parent' => 0, 'items' => 'x']]), 'malformed');
    assert_throws(fn () => apply_list([order([['nope' => 1]])]), 'malformed');
    assert_throws(fn () => apply_list([order([['id' => 2], ['id' => 1]], 0), order([['id' => 1]], 0)]), 'twice');
    $mixed = '<p class="x">one <b>1</b> and <b>2</b></p>';
    assert_throws(fn () => apply_list([order([['id' => 2], ['id' => 1]])], $mixed), 'text or comments');
    $commented = "<ul>\n  <li>a</li>\n  <!-- note -->\n  <li>b</li>\n</ul>";
    assert_throws(fn () => apply_list([order([['id' => 2], ['id' => 1]])], $commented), 'text or comments');
}
