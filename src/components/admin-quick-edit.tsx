
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Edit, MoreVertical, Languages } from 'lucide-react';
import Link from 'next/link';

interface AdminQuickEditProps {
  contentId: string;
}

export function AdminQuickEdit({ contentId }: AdminQuickEditProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Admin Actions">
          <MoreVertical className="h-5 w-5" />
          <span className="sr-only">Admin Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Admin Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/admin?edit=${contentId}`}>
            <Edit className="mr-2 h-4 w-4" />
            <span>Edit Content</span>
          </Link>
        </DropdownMenuItem>
         <DropdownMenuItem asChild>
          <Link href={`/settings/subtitle-tools?contentId=${contentId}`}>
            <Languages className="mr-2 h-4 w-4" />
            <span>Subtitle Tools</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
