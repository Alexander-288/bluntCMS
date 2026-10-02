<?php
declare(strict_types=1);

function test_smoke_blunt_error_carries_status(): void
{
    $e = new BluntError('nope', 409);
    assert_same('nope', $e->getMessage());
    assert_same(409, $e->status);
}
