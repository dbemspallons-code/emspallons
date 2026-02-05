import { supabase } from '../supabase/supabaseClient';

const BUCKET = 'school-photos';
const TABLE = 'school_photos';

export async function listPhotos() {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadPhoto(file) {
  if (!file) throw new Error('Fichier manquant');
  const timestamp = Date.now();
  const path = `${timestamp}-${file.name}`;

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (uploadError) throw uploadError;

  // Get public URL (requires bucket to be public or use signed URLs)
  const { data: urlData } = await supabase.storage.from(BUCKET).getPublicUrl(path);
  const publicUrl = urlData?.publicUrl || null;

  // Persist metadata in DB
  const { data, error } = await supabase.from(TABLE).insert([{ file_name: file.name, storage_path: path, url: publicUrl }]).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deletePhoto(photo) {
  if (!photo) throw new Error('Photo manquante');
  if (photo.storage_path) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    if (removeError) console.warn('Erreur suppression fichier storage:', removeError.message || removeError);
  }
  const { error } = await supabase.from(TABLE).delete().eq('id', photo.id);
  if (error) throw error;
  return { success: true };
}
