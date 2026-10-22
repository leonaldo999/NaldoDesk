<?php

namespace Tests\Feature;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Str;
use Tests\TestCase;

final class RedisInfrastructureTest extends TestCase
{
    public function test_redis_stores_cache_and_worker_processes_a_queued_job(): void
    {
        if (! filter_var(env('REDIS_INTEGRATION_TESTS', false), FILTER_VALIDATE_BOOL)) {
            $this->markTestSkipped('Define REDIS_INTEGRATION_TESTS=true cuando Redis esté instalado y activo.');
        }

        $key = 'naldo:redis-test:'.Str::uuid();
        $queue = 'naldo-test-'.Str::uuid();

        try {
            Cache::store('redis')->put($key, 'cache-ok', 60);
            $this->assertSame('cache-ok', Cache::store('redis')->get($key));

            Queue::connection('redis')->pushOn($queue, new RedisIntegrationProbeJob($key));

            Artisan::call('queue:work', [
                'connection' => 'redis',
                '--queue' => $queue,
                '--once' => true,
                '--sleep' => 0,
                '--timeout' => 60,
            ]);

            $this->assertSame('job-processed', Cache::store('redis')->get($key));
        } finally {
            Cache::store('redis')->forget($key);
        }
    }
}

final class RedisIntegrationProbeJob implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly string $cacheKey) {}

    public function handle(): void
    {
        Cache::store('redis')->put($this->cacheKey, 'job-processed', 60);
    }
}
