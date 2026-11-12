// Creates isolated, fictitious businesses in the existing LOCAL Compose database.
// Passwords are generated per run and written only to an ignored local file.
import { execFileSync } from 'node:child_process'
import { randomUUID, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const fixturePath = fileURLToPath(new URL('../e2e.local.json', import.meta.url))
const run = (php) =>
  execFileSync(
    'docker',
    ['compose', '--env-file', '.env.docker', 'exec', '-T', 'app', 'php'],
    {
      cwd: root,
      input: `<?php\nrequire '/var/www/html/vendor/autoload.php';\n$app = require '/var/www/html/bootstrap/app.php';\n$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();\nif (!app()->environment('local')) { throw new RuntimeException('Local environment required'); }\n${php}`,
      encoding: 'utf8',
    },
  )

if (process.argv[2] === 'cleanup') {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  if (!/^frontend-e2e-[a-f0-9-]+$/.test(fixture.marker))
    throw new Error('Invalid fixture marker')
  const cleanupResult = run(String.raw`
    $marker = '${fixture.marker}';
    Illuminate\Support\Facades\DB::transaction(function () use ($marker) {
      $ids = App\Models\Business::whereIn('name', [$marker, $marker.'-other'])->pluck('id');
      $users = App\Models\User::whereIn('business_id', $ids)->orWhere('email', $marker.'-unassigned@example.test')->pluck('id');
      $products = App\Models\Product::whereIn('business_id', $ids)->pluck('id');
      $sales = App\Models\Sale::whereIn('business_id', $ids)->pluck('id');
      Illuminate\Support\Facades\DB::table('sessions')->whereIn('user_id', $users)->delete();
      Illuminate\Support\Facades\DB::table('inventory_movements')->whereIn('product_id', $products)->delete();
      Illuminate\Support\Facades\DB::table('sale_items')->whereIn('sale_id', $sales)->delete();
      App\Models\Sale::whereIn('id', $sales)->delete();
      App\Models\Business::whereIn('id', $ids)->delete();
      App\Models\User::whereIn('id', $users)->delete();
    });
    echo 'CLEANUP_OK';`)
  if (cleanupResult.trim() !== 'CLEANUP_OK')
    throw new Error('Cleanup failed; fixture retained for recovery')
  unlinkSync(fixturePath)
  console.log('Isolated frontend test data removed.')
} else {
  if (existsSync(fixturePath))
    throw new Error('Run cleanup before provisioning again')
  const marker = `frontend-e2e-${randomUUID()}`
  const password = randomBytes(24).toString('hex')
  const php = String.raw`
    $result = Illuminate\Support\Facades\DB::transaction(function () {
    $business = App\Models\Business::create(['name' => '${marker}']);
    $other = App\Models\Business::create(['name' => '${marker}-other']);
    $result = ['marker' => '${marker}', 'password' => '${password}'];
    foreach (['admin' => [$business->id, 'admin'], 'staff' => [$business->id, 'staff'], 'other' => [$other->id, 'admin'], 'unassigned' => [null, 'staff']] as $key => [$businessId, $role]) {
      $email = '${marker}-'.$key.'@example.test';
      App\Models\User::create(['business_id' => $businessId, 'name' => 'Demo '.ucfirst($key), 'email' => $email, 'password' => '${password}', 'role' => $role]);
      $result[$key] = $email;
    }
      return $result;
    });
    echo json_encode($result);`
  const result = JSON.parse(run(php))
  writeFileSync(fixturePath, JSON.stringify(result))
  console.log(
    'Isolated frontend test accounts ready (e2e.local.json, ignored).',
  )
}
