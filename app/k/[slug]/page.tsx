import KitchenAccess from '@/components/routes/KitchenAccess';

// The stable, bookmarkable address a guest keeps. Deliberately NOT the Kitchen:
// finding or forwarding this URL grants nothing at all.
export function generateStaticParams() {
  return [{ slug: '_' }];
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <KitchenAccess slug={slug} />;
}
