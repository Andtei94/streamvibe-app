
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';

const formSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const { login, loading: authLoading } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: FormValues) => {
    const result = await login(values.email, values.password);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error('Authentication Failed', { description: result.message });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
       <div className="mb-8">
            <Logo className="h-10 w-auto" />
       </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Enter your credentials to sign in. If you don't have an account, one will be created for you automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting || authLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting || authLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting || authLoading || !form.formState.isValid}>
                {(isSubmitting || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In / Sign Up
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
