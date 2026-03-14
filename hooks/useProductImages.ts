import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { uploadImage, deleteImage } from '@/services/storageService';
import { PRODUCT_IMAGE_BUCKET } from '@/lib/constants';
import { ProductImage } from '@/types/models';

export function useProductImages(productId: string) {
  const qc = useQueryClient();

  const images = useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .order('sort_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ProductImage[];
    },
    enabled: !!productId,
  });

  const addImage = useMutation({
    mutationFn: async (uri: string) => {
      const blob = await uriToBlob(uri);
      const ext = uri.split('.').pop()?.split(/[?#]/)[0] ?? 'jpg';
      const filePath = `${productId}/${Date.now()}.${ext}`;
      const { publicUrl } = await uploadImage(PRODUCT_IMAGE_BUCKET, filePath, blob);
      const currentCount = images.data?.length ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('product_images').insert({
        product_id: productId,
        url: publicUrl,
        storage_path: filePath,
        is_primary: currentCount === 0,
        sort_order: currentCount,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-images', productId] }),
  });

  const removeImage = useMutation({
    mutationFn: async (image: Pick<ProductImage, 'id' | 'storage_path'>) => {
      if (image.storage_path) await deleteImage(PRODUCT_IMAGE_BUCKET, image.storage_path);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('product_images').delete().eq('id', image.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-images', productId] }),
  });

  const setPrimary = useMutation({
    mutationFn: async (imageId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('product_images').update({ is_primary: false }).eq('product_id', productId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('product_images').update({ is_primary: true }).eq('id', imageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-images', productId] }),
  });

  return { images, addImage, removeImage, setPrimary };
}

function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('فشل قراءة الصورة'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

/** Upload a batch of local image URIs for a newly created product */
export async function uploadProductImages(productId: string, uris: string[]): Promise<void> {
  for (let i = 0; i < uris.length; i++) {
    const blob = await uriToBlob(uris[i]);
    const ext = uris[i].split('.').pop()?.split(/[?#]/)[0] ?? 'jpg';
    const filePath = `${productId}/${Date.now()}-${i}.${ext}`;
    const { publicUrl } = await uploadImage(PRODUCT_IMAGE_BUCKET, filePath, blob);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('product_images').insert({
      product_id: productId,
      url: publicUrl,
      storage_path: filePath,
      is_primary: i === 0,
      sort_order: i,
    });
    if (error) throw new Error(error.message);
  }
}
