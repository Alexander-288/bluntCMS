<?php
declare(strict_types=1);

/** An expected, user-facing failure. $status is the HTTP status to answer with. */
class BluntError extends RuntimeException
{
    public function __construct(string $message, public int $status = 400)
    {
        parent::__construct($message);
    }
}
