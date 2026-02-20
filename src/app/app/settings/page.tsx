import { Card, CardContent, CardTitle } from '@/components/ui';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-text-muted">Application settings.</p>
      </div>

      <Card>
        <CardTitle className="mb-4">About</CardTitle>
        <CardContent>
          <p className="text-sm text-text-muted mb-4">
            Duskwarden Tools is a creature conversion workbench for tabletop RPG GMs.
          </p>
          <p className="text-sm text-text-muted">
            Version 0.1.0
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardTitle className="mb-4">Data</CardTitle>
        <CardContent>
          <p className="text-sm text-text-muted">
            All data is stored locally in your browser&apos;s Supabase session. 
            Your creatures and projects are private to your account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
