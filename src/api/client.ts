import { adminEmail, supabase } from "../lib/supabaseClient";

export type AdminProfileInput = {
  about: string;
  email: string;
  instagram: string;
  image: string;
  headerImage: string;
};

function generateId() {
  const timestamp = Date.now().toString().padStart(15, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  return fallback;
}

async function must<T>(promise: PromiseLike<{ data: T; error: any }>, fallback: string): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    throw new Error(getErrorMessage(error, fallback));
  }
  return data;
}

// ============================================
// AUTH
// ============================================
const ADMIN_SECURITY_CODE = "286628";
const AUTH_SECURITY_KEY = "admin-auth-security";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 4500;

type AuthSecurityState = {
  failedAttempts: number;
  lockUntil: number;
};

function getAuthSecurityState(): AuthSecurityState {
  if (typeof window === "undefined") {
    return { failedAttempts: 0, lockUntil: 0 };
  }

  const raw = window.localStorage.getItem(AUTH_SECURITY_KEY);
  if (!raw) {
    return { failedAttempts: 0, lockUntil: 0 };
  }

  try {
    const parsed = JSON.parse(raw);
    const failedAttempts = Number.isFinite(parsed?.failedAttempts) ? parsed.failedAttempts : 0;
    const lockUntil = Number.isFinite(parsed?.lockUntil) ? parsed.lockUntil : 0;
    return {
      failedAttempts: Math.max(0, Math.floor(failedAttempts)),
      lockUntil: Math.max(0, Math.floor(lockUntil)),
    };
  } catch {
    return { failedAttempts: 0, lockUntil: 0 };
  }
}

function setAuthSecurityState(state: AuthSecurityState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_SECURITY_KEY, JSON.stringify(state));
}

function clearAuthSecurityState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_SECURITY_KEY);
}

async function applyAdaptiveDelay(failedAttempts: number) {
  const adaptiveDelay = Math.min(
    BASE_DELAY_MS * Math.max(1, failedAttempts + 1),
    MAX_DELAY_MS
  );
  const jitter = Math.floor(Math.random() * 250);
  await new Promise((resolve) => setTimeout(resolve, adaptiveDelay + jitter));
}

function formatLockMessage(remainingMs: number) {
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  return `Çok fazla deneme yapıldı. ${remainingSeconds} saniye sonra tekrar deneyin.`;
}

async function enforceAuthGuard() {
  const currentState = getAuthSecurityState();
  const now = Date.now();

  if (currentState.lockUntil > now) {
    throw new Error(formatLockMessage(currentState.lockUntil - now));
  }

  if (currentState.lockUntil > 0 && currentState.lockUntil <= now) {
    clearAuthSecurityState();
  }

  await applyAdaptiveDelay(currentState.failedAttempts);
}

function recordAuthFailure() {
  const now = Date.now();
  const currentState = getAuthSecurityState();
  const failedAttempts = Math.min(currentState.failedAttempts + 1, MAX_FAILED_ATTEMPTS + 5);
  const lockUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_DURATION_MS : 0;

  setAuthSecurityState({
    failedAttempts,
    lockUntil,
  });
}

function recordAuthSuccess() {
  clearAuthSecurityState();
}

function normalizeAuthError(error: unknown) {
  const incomingMessage = getErrorMessage(error, "Giriş doğrulanamadı");
  if (incomingMessage.includes("Çok fazla deneme")) {
    return new Error(incomingMessage);
  }
  return new Error("Giriş doğrulanamadı");
}

export async function signInAdmin(email: string, password: string) {
  await enforceAuthGuard();

  try {
    const data = await must(
      supabase.auth.signInWithPassword({ email, password }),
      "Giriş sırasında hata oluştu"
    );

    const userEmail = data.user?.email?.toLowerCase();
    if (userEmail !== adminEmail.toLowerCase()) {
      await supabase.auth.signOut();
      throw new Error("Bu hesap yönetici hesabı değil");
    }

    await must(supabase.auth.signOut(), "Geçici oturum kapatılamadı");
    recordAuthSuccess();

    return { success: true };
  } catch (error) {
    recordAuthFailure();
    throw normalizeAuthError(error);
  }
}

export async function verifyAdminLoginCode(email: string, password: string, token: string) {
  await enforceAuthGuard();

  try {
    if (token.trim() !== ADMIN_SECURITY_CODE) {
      throw new Error("Güvenlik kodu hatalı");
    }

    const data = await must(
      supabase.auth.signInWithPassword({ email, password }),
      "Giriş sırasında hata oluştu"
    );

    const userEmail = data.user?.email?.toLowerCase();
    if (userEmail !== adminEmail.toLowerCase()) {
      await supabase.auth.signOut();
      throw new Error("Bu hesap yönetici hesabı değil");
    }

    recordAuthSuccess();
    return { success: true };
  } catch (error) {
    recordAuthFailure();
    throw normalizeAuthError(error);
  }
}

export async function signOutAdmin() {
  await must(supabase.auth.signOut(), "Çıkış sırasında hata oluştu");
}

export async function getCurrentAdminStatus() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return false;
  return data.user.email?.toLowerCase() === adminEmail.toLowerCase();
}

// ============================================
// ADMIN PROFILE
// ============================================
export async function fetchAdminProfile() {
  const modern = await supabase
    .from("admin_profile")
    .select("id, about, email, instagram, image, header_image")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!modern.error) {
    const row = modern.data;
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      about: row.about ?? "",
      email: row.email ?? adminEmail,
      instagram: row.instagram ?? "",
      image: row.image || "",
      headerImage: row.header_image || "",
    };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Profil verisi alınamadı"));
  }

  const legacyRow = await must(
    supabase
      .from("admin_profile")
      .select("id, about, email, instagram, image")
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    "Profil verisi alınamadı"
  );

  if (!legacyRow) {
    return null;
  }

  return {
    id: legacyRow.id,
    about: legacyRow.about ?? "",
    email: legacyRow.email ?? adminEmail,
    instagram: legacyRow.instagram ?? "",
    image: legacyRow.image || "",
    headerImage: "",
  };
}

export async function upsertAdminProfile(profile: AdminProfileInput) {
  const modern = await supabase.from("admin_profile").upsert(
    {
      id: 1,
      about: profile.about,
      email: profile.email,
      instagram: profile.instagram,
      image: profile.image,
      header_image: profile.headerImage,
    },
    { onConflict: "id" }
  );

  if (!modern.error) {
    return;
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Profil güncellenemedi"));
  }

  await must(
    supabase.from("admin_profile").upsert(
      {
        id: 1,
        about: profile.about,
        email: profile.email,
        instagram: profile.instagram,
        image: profile.image,
      },
      { onConflict: "id" }
    ),
    "Profil güncellenemedi"
  );
}

// ============================================
// WRITINGS
// ============================================
export async function fetchWritings() {
  const modern = await supabase
    .from("writings")
    .select("id, title, author, image, status, date, views")
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (!modern.error) {
    return (modern.data ?? []).map((item: any) => ({
      ...item,
      status: item.status ?? "published",
      views: item.views ?? 0,
      date: item.date ?? "",
      title: item.title ?? "",
      author: item.author ?? "",
      image: item.image ?? "",
    }));
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Yazılar alınamadı"));
  }

  const legacy = await supabase
    .from("writings")
    .select("id, title, author, image, status, date")
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Yazılar alınamadı"));
  }

  return (legacy.data ?? []).map((item: any) => ({
    ...item,
    status: item.status ?? "published",
    views: 0,
    date: item.date ?? "",
    title: item.title ?? "",
    author: item.author ?? "",
    image: item.image ?? "",
  }));
}

/** Fetch full content of a single writing for the read modal */
export async function fetchWritingContent(id: string) {
  const row = await must(
    supabase.from("writings").select("content").eq("id", id).single(),
    "Yazı içeriği alınamadı"
  );
  return row?.content ?? "";
}

export async function createWriting(writing: any) {
  const id = writing.id ?? generateId();
  const payload = {
    ...writing,
    id,
    date: writing.date ?? new Date().toISOString().split("T")[0],
  };

  const modern = await supabase.from("writings").insert(payload);
  if (!modern.error) {
    return { id };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Yazı eklenemedi"));
  }

  const { views, ...legacyPayload } = payload;
  await must(supabase.from("writings").insert(legacyPayload), "Yazı eklenemedi");

  return { id };
}

export async function updateWriting(id: string, data: any) {
  const modern = await supabase.from("writings").update(data).eq("id", id);
  if (!modern.error) {
    return { id };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Yazı güncellenemedi"));
  }

  const { views, ...legacyData } = data;
  await must(supabase.from("writings").update(legacyData).eq("id", id), "Yazı güncellenemedi");
  return { id };
}

export async function deleteWriting(id: string) {
  await must(supabase.from("writings").delete().eq("id", id), "Yazı silinemedi");
  return { id };
}

// ============================================
// BOOKS
// ============================================

/** Convert a base64 data URL to a Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/** Upload a base64 PDF to Supabase Storage and return the public URL */
async function uploadBookPdf(pdfData: string, bookId: string): Promise<string> {
  if (!pdfData.startsWith('data:')) return pdfData; // already a URL

  const blob = dataUrlToBlob(pdfData);
  const ext = pdfData.includes('pdf') ? 'pdf' : 'pdf';
  const path = `books/${bookId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('books').upload(path, blob, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw new Error('PDF yüklenemedi: ' + error.message);

  const { data } = supabase.storage.from('books').getPublicUrl(path);
  return data.publicUrl;
}

function getBookStoragePathFromUrl(pdfUrl: string): string | null {
  if (!pdfUrl) return null;

  try {
    const url = new URL(pdfUrl);
    const path = url.pathname;

    const publicPrefix = '/storage/v1/object/public/books/';
    const signedPrefix = '/storage/v1/object/sign/books/';

    if (path.includes(publicPrefix)) {
      const storagePath = path.split(publicPrefix)[1];
      return storagePath ? decodeURIComponent(storagePath) : null;
    }

    if (path.includes(signedPrefix)) {
      const storagePath = path.split(signedPrefix)[1];
      return storagePath ? decodeURIComponent(storagePath) : null;
    }

    if (path.includes('/books/')) {
      const storagePath = path.split('/books/')[1];
      return storagePath ? decodeURIComponent(storagePath) : null;
    }

    return null;
  } catch {
    const fallback = pdfUrl.split('/books/')[1]?.split('?')[0];
    return fallback ? decodeURIComponent(fallback) : null;
  }
}

/** Delete a book PDF from storage if it's a storage URL */
async function deleteBookPdf(pdfUrl: string) {
  if (!pdfUrl || !pdfUrl.includes('/storage/')) return;

  try {
    const path = getBookStoragePathFromUrl(pdfUrl);
    if (path) {
      await supabase.storage.from('books').remove([path]);
    }
  } catch (_) {
    /* ignore */
  }
}

function isMissingColumnError(error: any) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return (
    error?.code === "PGRST204" ||
    error?.code === "42703" ||
    message.includes("could not find") ||
    message.includes("does not exist") ||
    message.includes("column")
  );
}

function isMissingBooksColumnError(error: any) {
  return isMissingColumnError(error);
}

export async function fetchBooks() {
  const modern = await supabase
    .from("books")
    .select("id, title, owner, content, description, cover, photo, views, downloads, created_at, issue, pdf_name, pdf")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (!modern.error) {
    return modern.data ?? [];
  }

  if (!isMissingBooksColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Kitaplar alınamadı"));
  }

  const legacy = await supabase
    .from("books")
    .select("id, title, description, cover, pdf")
    .order("id", { ascending: false });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Kitaplar alınamadı"));
  }

  return (legacy.data ?? []).map((book: any) => ({
    ...book,
    owner: book.owner ?? "",
    content: book.content ?? book.description ?? "",
    photo: book.photo ?? book.cover ?? "",
    views: book.views ?? 0,
    downloads: book.downloads ?? 0,
    issue: book.issue ?? "",
    pdf_name: book.pdf_name ?? "",
    created_at: book.created_at ?? null,
  }));
}

export async function createBook(book: any) {
  const id = book.id ?? generateId();
  const { pdf, ...contentData } = book;
  let uploadedPdfUrl: string | null = null;

  // Upload PDF to Storage first, get URL
  if (pdf) {
    if (pdf.startsWith('data:')) {
      uploadedPdfUrl = await uploadBookPdf(pdf, id);
      contentData.pdf = uploadedPdfUrl;
    } else {
      contentData.pdf = pdf;
    }
  }

  // Single insert with all data including PDF URL
  try {
    await must(supabase.from("books").insert({ ...contentData, id }), "Kitap eklenemedi");
    return { id };
  } catch (error) {
    // If DB insert fails after upload, remove orphan file
    if (uploadedPdfUrl) {
      await deleteBookPdf(uploadedPdfUrl);
    }
    throw error;
  }
}

export async function fetchBookPdf(id: string) {
  const row = await must(
    supabase.from("books").select("pdf").eq("id", id).single(),
    "PDF alınamadı"
  );
  return row?.pdf ?? null;
}

export async function updateBook(id: string, data: any) {
  const { pdf, ...restData } = data;

  let oldPdfUrl: string | null = null;
  let uploadedPdfUrl: string | null = null;
  const isReplacingPdf = typeof pdf === "string" && pdf.startsWith("data:");

  // Handle PDF: upload first, only remove old file after DB update succeeds
  if (typeof pdf === "string" && pdf.trim()) {
    if (isReplacingPdf) {
      try {
        const old = await supabase.from("books").select("pdf").eq("id", id).single();
        oldPdfUrl = old?.data?.pdf ?? null;
      } catch (_) {
        oldPdfUrl = null;
      }

      uploadedPdfUrl = await uploadBookPdf(pdf, id);
      restData.pdf = uploadedPdfUrl;
    } else {
      restData.pdf = pdf;
    }
  }

  // Single update with all data
  try {
    await must(supabase.from("books").update(restData).eq("id", id), "Kitap güncellenemedi");
  } catch (error) {
    // DB update failed, keep old PDF and clean newly uploaded replacement if any
    if (uploadedPdfUrl) {
      await deleteBookPdf(uploadedPdfUrl);
    }
    throw error;
  }

  // DB update succeeded, now safely remove old PDF if it was replaced
  if (isReplacingPdf && oldPdfUrl && oldPdfUrl !== uploadedPdfUrl) {
    await deleteBookPdf(oldPdfUrl);
  }

  return { id };
}

export async function deleteBook(id: string) {
  let oldPdfUrl: string | null = null;

  try {
    const current = await supabase.from("books").select("pdf").eq("id", id).single();
    oldPdfUrl = current?.data?.pdf ?? null;
  } catch (_) {
    oldPdfUrl = null;
  }

  await must(supabase.from("books").delete().eq("id", id), "Kitap silinemedi");

  if (oldPdfUrl) {
    await deleteBookPdf(oldPdfUrl);
  }

  return { id };
}

// ============================================
// SUGGESTIONS
// ============================================
export async function fetchSuggestions() {
  const modern = await supabase
    .from("suggestions")
    .select("id, image, title, genre, author, description, link, views, created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (!modern.error) {
    return (modern.data ?? []).map((item: any) => ({
      ...item,
      image: item.image ?? "",
      title: item.title ?? "",
      genre: item.genre ?? "",
      author: item.author ?? "",
      description: item.description ?? "",
      link: item.link ?? "",
      views: item.views ?? 0,
      created_at: item.created_at ?? null,
    }));
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Öneriler alınamadı"));
  }

  const legacy = await supabase
    .from("suggestions")
    .select("id, image, title, genre, description, link")
    .order("id", { ascending: false });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Öneriler alınamadı"));
  }

  return (legacy.data ?? []).map((item: any) => ({
    ...item,
    image: item.image ?? "",
    title: item.title ?? "",
    genre: item.genre ?? "",
    author: item.author ?? "",
    description: item.description ?? "",
    link: item.link ?? "",
    views: 0,
    created_at: null,
  }));
}

export async function createSuggestion(suggestion: any) {
  const id = suggestion.id ?? generateId();
  const payload = { ...suggestion, id };

  const modern = await supabase.from("suggestions").insert(payload);
  if (!modern.error) {
    return { id };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Öneri eklenemedi"));
  }

  const { author, views, created_at, ...legacyPayload } = payload;
  await must(supabase.from("suggestions").insert(legacyPayload), "Öneri eklenemedi");
  return { id };
}

export async function updateSuggestion(id: string, data: any) {
  const modern = await supabase.from("suggestions").update(data).eq("id", id);
  if (!modern.error) {
    return { id };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Öneri güncellenemedi"));
  }

  const { author, views, created_at, ...legacyData } = data;
  await must(
    supabase.from("suggestions").update(legacyData).eq("id", id),
    "Öneri güncellenemedi"
  );
  return { id };
}

export async function deleteSuggestion(id: string) {
  await must(supabase.from("suggestions").delete().eq("id", id), "Öneri silinemedi");
  return { id };
}

// ============================================
// POLLS
// ============================================
export async function fetchPolls() {
  const polls = await must(supabase.from("polls").select("*").order("id", { ascending: false }), "Anketler alınamadı");
  const options = await must(
    supabase.from("poll_options").select("id, poll_id, text, votes"),
    "Anket seçenekleri alınamadı"
  );

  const optionsByPoll = new Map<string, any[]>();
  for (const option of options ?? []) {
    const key = option.poll_id as string;
    if (!optionsByPoll.has(key)) {
      optionsByPoll.set(key, []);
    }
    optionsByPoll.get(key)!.push({
      id: option.id,
      text: option.text ?? "",
      votes: option.votes ?? 0,
    });
  }

  return (polls ?? []).map((poll) => ({
    id: poll.id,
    question: poll.question ?? "",
    totalVotes: poll.total_votes ?? 0,
    views: poll.view_count ?? 0,
    options: optionsByPoll.get(poll.id) ?? [],
  }));
}

export async function createPoll(poll: any) {
  const id = poll.id ?? generateId();

  const payload = {
    id,
    question: poll.question,
    total_votes: poll.totalVotes ?? 0,
    view_count: poll.views ?? 0,
  };

  const modern = await supabase.from("polls").insert(payload);
  if (modern.error) {
    if (!isMissingColumnError(modern.error)) {
      throw new Error(getErrorMessage(modern.error, "Anket eklenemedi"));
    }

    const { view_count, ...legacyPayload } = payload;
    await must(supabase.from("polls").insert(legacyPayload), "Anket eklenemedi");
  }

  const options = (poll.options ?? []).map((option: any) => ({
    id: option.id ?? generateId(),
    poll_id: id,
    text: option.text,
    votes: option.votes ?? 0,
  }));

  if (options.length > 0) {
    await must(supabase.from("poll_options").insert(options), "Anket seçenekleri eklenemedi");
  }

  return { id };
}

export async function updatePoll(id: string, data: any) {
  if (data.question !== undefined || data.views !== undefined) {
    const updateData: any = {};
    if (data.question !== undefined) updateData.question = data.question;
    if (data.views !== undefined) updateData.view_count = data.views;

    const modern = await supabase.from("polls").update(updateData).eq("id", id);
    if (modern.error) {
      if (!isMissingColumnError(modern.error)) {
        throw new Error(getErrorMessage(modern.error, "Anket güncellenemedi"));
      }

      const { view_count, ...legacyUpdateData } = updateData;
      await must(
        supabase.from("polls").update(legacyUpdateData).eq("id", id),
        "Anket güncellenemedi"
      );
    }
  }

  if (Array.isArray(data.options)) {
    await must(
      supabase.from("poll_options").delete().eq("poll_id", id),
      "Eski anket seçenekleri silinemedi"
    );

    const nextOptions = data.options.map((option: any) => ({
      id: option.id ?? generateId(),
      poll_id: id,
      text: option.text,
      votes: option.votes ?? 0,
    }));

    if (nextOptions.length > 0) {
      await must(
        supabase.from("poll_options").insert(nextOptions),
        "Yeni anket seçenekleri eklenemedi"
      );
    }

    const totalVotes = nextOptions.reduce(
      (sum: number, option: any) => sum + (option.votes ?? 0),
      0
    );

    await must(
      supabase.from("polls").update({ total_votes: totalVotes }).eq("id", id),
      "Anket toplam oy sayısı güncellenemedi"
    );
  }

  return { id };
}

export async function deletePoll(id: string) {
  await must(
    supabase.from("poll_options").delete().eq("poll_id", id),
    "Anket seçenekleri silinemedi"
  );
  await must(supabase.from("polls").delete().eq("id", id), "Anket silinemedi");
  return { id };
}

export async function votePollOption(pollId: string, optionId: string) {
  await must(
    supabase.rpc("vote_poll_option", {
      p_poll_id: pollId,
      p_option_id: optionId,
    }),
    "Oy verme işlemi başarısız"
  );

  return { success: true };
}

// ============================================
// INTERVIEWS
// ============================================
export async function fetchInterviews() {
  const modern = await supabase
    .from("interviews")
    .select("id, title, description, photo, interviewer, interviewee, view_count, created_at")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (!modern.error) {
    return (modern.data ?? []).map((item: any) => ({
      id: item.id,
      title: item.title ?? "",
      description: item.description ?? "",
      photo: item.photo ?? "",
      interviewer: item.interviewer ?? "",
      interviewee: item.interviewee ?? "",
      dialogues: [] as any[],
      views: item.view_count ?? 0,
      created_at: item.created_at ?? "",
    }));
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Röportajlar alınamadı"));
  }

  const legacy = await supabase
    .from("interviews")
    .select("id, title, description, photo, interviewer, interviewee")
    .order("id", { ascending: false });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Röportajlar alınamadı"));
  }

  return (legacy.data ?? []).map((item: any) => ({
    id: item.id,
    title: item.title ?? "",
    description: item.description ?? "",
    photo: item.photo ?? "",
    interviewer: item.interviewer ?? "",
    interviewee: item.interviewee ?? "",
    dialogues: [] as any[],
    views: 0,
    created_at: "",
  }));
}

/** Fetch dialogues for a single interview (lazy-loaded when reading) */
export async function fetchInterviewDialogues(interviewId: string) {
  const modern = await supabase
    .from("dialogues")
    .select("id, interview_id, speaker, text, sort_order")
    .eq("interview_id", interviewId)
    .order("sort_order", { ascending: true });

  if (!modern.error) {
    return (modern.data ?? []).map((d: any) => ({
      id: d.id,
      speaker: d.speaker,
      text: d.text,
    }));
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Röportaj konuşmaları alınamadı"));
  }

  const legacy = await supabase
    .from("dialogues")
    .select("id, interview_id, speaker, text")
    .eq("interview_id", interviewId)
    .order("id", { ascending: true });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Röportaj konuşmaları alınamadı"));
  }

  return (legacy.data ?? []).map((d: any) => ({
    id: d.id,
    speaker: d.speaker,
    text: d.text,
  }));
}

export async function createInterview(interview: any) {
  const id = interview.id ?? generateId();

  const payload = {
    id,
    title: interview.title,
    description: interview.description,
    photo: interview.photo,
    interviewer: interview.interviewer,
    interviewee: interview.interviewee,
    view_count: interview.views ?? 0,
    created_at: interview.created_at ?? new Date().toISOString(),
  };

  const modern = await supabase.from("interviews").insert(payload);
  if (modern.error) {
    if (!isMissingColumnError(modern.error)) {
      throw new Error(getErrorMessage(modern.error, "Röportaj eklenemedi"));
    }

    const { view_count, created_at, ...legacyPayload } = payload;
    await must(supabase.from("interviews").insert(legacyPayload), "Röportaj eklenemedi");
  }

  const dialogues = (interview.dialogues ?? []).map((dialogue: any, index: number) => ({
    id: dialogue.id ?? generateId(),
    interview_id: id,
    speaker: dialogue.speaker,
    text: dialogue.text,
    sort_order: dialogue.sort_order ?? index,
  }));

  if (dialogues.length > 0) {
    const dialogueInsert = await supabase.from("dialogues").insert(dialogues);
    if (dialogueInsert.error) {
      if (!isMissingColumnError(dialogueInsert.error)) {
        throw new Error(getErrorMessage(dialogueInsert.error, "Konuşma eklenemedi"));
      }

      const legacyDialogues = dialogues.map(({ sort_order, ...item }: any) => item);
      await must(supabase.from("dialogues").insert(legacyDialogues), "Konuşma eklenemedi");
    }
  }

  return { id };
}

export async function updateInterview(id: string, data: any) {
  const updateData: any = {
    title: data.title,
    description: data.description,
    photo: data.photo,
    interviewer: data.interviewer,
    interviewee: data.interviewee,
  };
  if (data.views !== undefined) {
    updateData.view_count = data.views;
  }

  const modern = await supabase
    .from("interviews")
    .update(updateData)
    .eq("id", id);

  if (modern.error) {
    if (!isMissingColumnError(modern.error)) {
      throw new Error(getErrorMessage(modern.error, "Röportaj güncellenemedi"));
    }

    const { view_count, ...legacyUpdateData } = updateData;
    await must(
      supabase.from("interviews").update(legacyUpdateData).eq("id", id),
      "Röportaj güncellenemedi"
    );
  }

  // Only update dialogues if provided and non-empty (preserves existing dialogues when only other fields change)
  if (Array.isArray(data.dialogues) && data.dialogues.length > 0) {
    await must(
      supabase.from("dialogues").delete().eq("interview_id", id),
      "Eski konuşmalar temizlenemedi"
    );

    const dialogues = data.dialogues.map((dialogue: any, index: number) => ({
      id: dialogue.id ?? generateId(),
      interview_id: id,
      speaker: dialogue.speaker,
      text: dialogue.text,
      sort_order: dialogue.sort_order ?? index,
    }));

    const dialogueInsert = await supabase.from("dialogues").insert(dialogues);
    if (dialogueInsert.error) {
      if (!isMissingColumnError(dialogueInsert.error)) {
        throw new Error(getErrorMessage(dialogueInsert.error, "Yeni konuşmalar eklenemedi"));
      }

      const legacyDialogues = dialogues.map(({ sort_order, ...item }: any) => item);
      await must(supabase.from("dialogues").insert(legacyDialogues), "Yeni konuşmalar eklenemedi");
    }
  }

  return { id };
}

export async function deleteInterview(id: string) {
  await must(
    supabase.from("dialogues").delete().eq("interview_id", id),
    "Röportaj konuşmaları silinemedi"
  );
  await must(supabase.from("interviews").delete().eq("id", id), "Röportaj silinemedi");
  return { id };
}

// ============================================
// ANNOUNCEMENTS
// ============================================
export async function fetchAnnouncements() {
  const modern = await supabase
    .from("announcements")
    .select("id, title, author, content, image, date, views")
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (!modern.error) {
    return (modern.data ?? []).map((item: any) => ({
      ...item,
      title: item.title ?? "",
      author: item.author ?? "",
      content: item.content ?? "",
      image: item.image ?? "",
      date: item.date ?? "",
      views: item.views ?? 0,
    }));
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Duyurular alınamadı"));
  }

  const legacy = await supabase
    .from("announcements")
    .select("id, title, author, content, image, date")
    .order("date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (legacy.error) {
    throw new Error(getErrorMessage(legacy.error, "Duyurular alınamadı"));
  }

  return (legacy.data ?? []).map((item: any) => ({
    ...item,
    title: item.title ?? "",
    author: item.author ?? "",
    content: item.content ?? "",
    image: item.image ?? "",
    date: item.date ?? "",
    views: 0,
  }));
}

export async function createAnnouncement(announcement: any) {
  const id = announcement.id ?? generateId();
  const payload = {
    ...announcement,
    id,
    date: announcement.date ?? new Date().toISOString().split("T")[0],
  };

  const modern = await supabase.from("announcements").insert(payload);
  if (!modern.error) {
    return { id };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Duyuru eklenemedi"));
  }

  const { views, ...legacyPayload } = payload;
  await must(supabase.from("announcements").insert(legacyPayload), "Duyuru eklenemedi");
  return { id };
}

export async function updateAnnouncement(id: string, data: any) {
  const modern = await supabase.from("announcements").update(data).eq("id", id);
  if (!modern.error) {
    return { id };
  }

  if (!isMissingColumnError(modern.error)) {
    throw new Error(getErrorMessage(modern.error, "Duyuru güncellenemedi"));
  }

  const { views, ...legacyData } = data;
  await must(
    supabase.from("announcements").update(legacyData).eq("id", id),
    "Duyuru güncellenemedi"
  );
  return { id };
}

export async function deleteAnnouncement(id: string) {
  await must(
    supabase.from("announcements").delete().eq("id", id),
    "Duyuru silinemedi"
  );
  return { id };
}
