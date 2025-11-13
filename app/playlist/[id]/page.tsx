import { Suspense } from 'react';
import PlaylistForm from '../../components/PlaylistForm';
import PlaylistView from '../../components/PlaylistView';
import Loader from '../../components/Loader';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<Loader />}>
      <PlaylistForm />
      <PlaylistView playlistId={id} />
    </Suspense>
  );
}
