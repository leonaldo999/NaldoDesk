<?php

return [
    'enabled' => (bool) env('REALTIME_ENABLED', env('APP_ENV') === 'local'),
    'event_channel' => env('REALTIME_EVENT_CHANNEL', 'naldo:events'),
];
