
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, onSnapshot, doc, deleteDoc, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LiveChannel } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Tv, MoreVertical, Edit, Trash2, ChevronRight, Loader2 } from 'lucide-react';
import { AddChannelForm } from './add-channel-form';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { EPGGrid } from './epg-grid';
import { StreamVibePlayer } from '@/components/stream-vibe-player';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { logger } from '@/lib/logger';

export default function LiveTvClient() {
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<LiveChannel | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<LiveChannel | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<LiveChannel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const { isAdmin } = useAuth();
  
  const handleSetSelectedChannel = useCallback((channel: LiveChannel | null) => {
    setSelectedChannel(channel);
    if (channel && playerContainerRef.current) {
        playerContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);
  
  const sortedChannels = useMemo(() => {
    return [...channels].sort((a,b) => a.name.localeCompare(b.name));
  }, [channels]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'live-channels'), (snapshot) => {
      const channelsList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as LiveChannel[];
      setChannels(channelsList);
      
      if (loading) setLoading(false);

    }, (error) => {
      logger.error({ error, stack: error.stack }, "Error fetching live channels");
      toast.error('Failed to Load Channels', {
        description: 'Could not retrieve the channel guide. Please check your connection and permissions.'
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [loading]);

  useEffect(() => {
    if(loading) return;

    const currentSelectionStillExists = selectedChannel && channels.some(c => c.id === selectedChannel.id);

    if ((!currentSelectionStillExists || !selectedChannel) && sortedChannels.length > 0) {
      setSelectedChannel(sortedChannels[0]);
    } else if (channels.length === 0) {
      setSelectedChannel(null);
    }
  }, [sortedChannels, channels, selectedChannel, loading]);

  const handleAddNew = () => {
    setEditingChannel(null);
    setIsFormOpen(true);
  };
  
  const handleEdit = (channel: LiveChannel) => {
    setEditingChannel(channel);
    setIsFormOpen(true);
  };

  const handleDelete = async (channel: LiveChannel | null) => {
    if (!channel || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'live-channels', channel.id));
      toast.success('Channel Deleted', {
        description: `${channel.name} has been removed.`,
      });
    } catch (error: any) {
      logger.error({ error, stack: error.stack, channelId: channel.id }, "Error deleting channel");
      let errorMessage = `Could not delete ${channel.name}.`;
      if (error instanceof FirestoreError) {
          if (error.code === 'permission-denied') {
              errorMessage = 'You do not have permission to delete this channel.';
          } else if (error.code === 'not-found') {
              errorMessage = `Channel ${channel.name} was not found. It may have already been deleted.`;
          } else {
              errorMessage = `A database error occurred: ${error.code}`;
          }
      }
      toast.error('Delete Failed', {
        description: errorMessage
      });
    } finally {
      setIsDeleting(false);
      setChannelToDelete(null);
    }
  };

  return (
    <AlertDialog>
      <div className="space-y-8">
          <div ref={playerContainerRef} tabIndex={-1} className="outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-lg">
              <Card>
                  <CardContent className="p-0">
                      <div className="aspect-video bg-black flex items-center justify-center text-muted-foreground">
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span>Loading Channels...</span>
                        </div>
                      ) : selectedChannel ? (
                          <StreamVibePlayer url={selectedChannel.url} title={selectedChannel.name} />
                      ) : (
                          <div className="text-center">
                              <Tv className="w-16 h-16 mx-auto mb-4" />
                              <h3 className="text-xl font-semibold">Select a channel to start watching</h3>
                              <p>Choose a program from the guide below.</p>
                          </div>
                      )}
                      </div>
                  </CardContent>
              </Card>
              <div className="mt-4 p-4 bg-card rounded-lg flex justify-between items-center">
                  <div>
                      <h2 className="text-2xl font-bold font-headline">{selectedChannel?.name || 'No Channel Selected'}</h2>
                      <p className="text-sm text-muted-foreground">{selectedChannel?.category || ''}</p>
                  </div>
                  {isAdmin && (
                      <div className="flex items-center gap-2">
                          {selectedChannel && (
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="icon" disabled={isDeleting}>
                                          <MoreVertical className="h-4 w-4" />
                                      </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleEdit(selectedChannel)} disabled={isDeleting}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          <span>Edit Channel</span>
                                      </DropdownMenuItem>
                                      <AlertDialogTrigger asChild>
                                          <div
                                              className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors text-red-500 focus:bg-red-500/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                                              onSelect={(e) => { e.preventDefault(); setChannelToDelete(selectedChannel); }}
                                          >
                                              <Trash2 className="mr-2 h-4 w-4" />
                                              <span>Delete Channel</span>
                                          </div>
                                      </AlertDialogTrigger>
                                  </DropdownMenuContent>
                              </DropdownMenu>
                          )}
                          <Button onClick={handleAddNew} disabled={isDeleting}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Add Channel
                          </Button>
                      </div>
                  )}
              </div>
          </div>
        
        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : sortedChannels.length > 0 ? (
          <EPGGrid channels={sortedChannels} onSelectChannel={handleSetSelectedChannel} selectedChannelId={selectedChannel?.id || null} />
        ) : (
          <div className="text-center py-20 border rounded-lg">
            <Tv className="w-12 h-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No Live Channels Available</h3>
            <p className="text-muted-foreground mt-1">Add your first channel to build your TV guide.</p>
            {isAdmin && (
              <Button onClick={handleAddNew} className="mt-4">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Channel
              </Button>
            )}
          </div>
        )}

        <AddChannelForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} initialData={editingChannel} />
      </div>

      <AlertDialogContent>
          <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the channel "{channelToDelete?.name}".
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setChannelToDelete(null)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => handleDelete(channelToDelete)}
              disabled={isDeleting}
          >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, delete
          </AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
