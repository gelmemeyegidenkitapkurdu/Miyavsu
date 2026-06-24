import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as api from "../api/client";

export interface Writing {
  id: string;
  title: string;
  author: string;
  image: string;
  content: string;
  status: "draft" | "published";
  date: string;
  views?: number;
}

export interface Book {
  id: string;
  title: string;
  owner?: string;
  content?: string;
  description?: string;
  cover?: string;
  pdf?: string;
  pdf_name?: string;
  photo?: string;
  participant1?: string;
  participant2?: string;
  dialogues?: Dialogue[];
  views?: number;
  downloads?: number;
  created_at?: string;
}

export interface Suggestion {
  id: string;
  image: string;
  title: string;
  genre: string;
  author: string;
  description: string;
  link: string;
  views?: number;
  created_at?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  views?: number;
}

export interface Dialogue {
  id: string;
  speaker: "host" | "guest";
  text: string;
}

export interface Interview {
  id: string;
  title: string;
  description: string;
  photo: string;
  interviewer: string;
  interviewee: string;
  dialogues: Dialogue[];
  created_at?: string;
  views?: number;
}

export interface Announcement {
  id: string;
  title: string;
  author: string;
  content: string;
  image: string;
  date: string;
  views?: number;
}

interface AdminProfile {
  about: string;
  email: string;
  instagram: string;
  image: string;
  headerImage: string;
}

interface AppState {
  isAdmin: boolean;
  isSessionLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  verifyLoginCode: (email: string, password: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeSession: () => Promise<void>;

  adminProfile: AdminProfile;
  updateProfile: (profile: Partial<AdminProfile>) => void;

  writings: Writing[];
  fetchWritings: () => Promise<void>;
  fetchWritingContent: (id: string) => Promise<string>;
  addWriting: (writing: Omit<Writing, "id" | "date">) => Promise<void>;
  updateWriting: (id: string, writing: Partial<Writing>) => Promise<void>;
  deleteWriting: (id: string) => Promise<void>;

  books: Book[];
  fetchBooks: () => Promise<void>;
  fetchBookPdf: (id: string) => Promise<string | null>;
  addBook: (book: Omit<Book, "id">) => Promise<void>;
  updateBook: (id: string, book: Partial<Book>) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;

  suggestions: Suggestion[];
  fetchSuggestions: () => Promise<void>;
  addSuggestion: (suggestion: Omit<Suggestion, "id">) => Promise<void>;
  updateSuggestion: (id: string, suggestion: Partial<Suggestion>) => Promise<void>;
  deleteSuggestion: (id: string) => Promise<void>;

  polls: Poll[];
  fetchPolls: () => Promise<void>;
  addPoll: (poll: Omit<Poll, "id" | "totalVotes">) => Promise<void>;
  updatePoll: (id: string, poll: Partial<Poll>) => Promise<void>;
  deletePoll: (id: string) => Promise<void>;
  votePoll: (pollId: string, optionId: string) => Promise<void>;

  interviews: Interview[];
  fetchInterviews: () => Promise<void>;
  fetchInterviewDialogues: (id: string) => Promise<Dialogue[]>;
  addInterview: (interview: Omit<Interview, "id">) => Promise<void>;
  updateInterview: (id: string, interview: Partial<Interview>) => Promise<void>;
  deleteInterview: (id: string) => Promise<void>;

  announcements: Announcement[];
  fetchAnnouncements: () => Promise<void>;
  addAnnouncement: (announcement: Omit<Announcement, "id" | "date">) => Promise<void>;
  updateAnnouncement: (id: string, announcement: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;

  darkMode: boolean;
  toggleDarkMode: () => void;
}

const DEFAULT_PROFILE: AdminProfile = {
  about: "Kitaplar, kahve ve huzur...",
  email: "gelmemeyegidenkitapkurdu@gmail.com",
  instagram: "https://instagram.com/gelmemeyegidenkitapkurdu",
  image: "",
  headerImage: "",
};

function createLocalId() {
  const timestamp = Date.now().toString().padStart(15, '0');
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAdmin: false,
      isSessionLoading: true,

      login: async (email, password) => {
        await api.signInAdmin(email, password);
      },

      verifyLoginCode: async (email, password, token) => {
        await api.verifyAdminLoginCode(email, password, token);
        set({ isAdmin: true });
      },

      logout: async () => {
        await api.signOutAdmin();
        set({ isAdmin: false });
      },

      initializeSession: async () => {
        set({ isSessionLoading: true });
        try {
          const [isAdmin, remoteProfile] = await Promise.all([
            api.getCurrentAdminStatus(),
            api.fetchAdminProfile(),
          ]);

          set((state) => ({
            isAdmin,
            adminProfile: remoteProfile
              ? {
                  about: remoteProfile.about,
                  email: remoteProfile.email,
                  instagram: remoteProfile.instagram,
                  image: remoteProfile.image,
                  headerImage: remoteProfile.headerImage || state.adminProfile.headerImage,
                }
              : state.adminProfile,
            isSessionLoading: false,
          }));
        } catch (error) {
          console.error("[Store] initializeSession error:", error);
          set({ isAdmin: false, isSessionLoading: false });
        }
      },

      adminProfile: DEFAULT_PROFILE,

      updateProfile: (profile) => {
        const nextProfile = { ...get().adminProfile, ...profile };
        set({ adminProfile: nextProfile });
        api.upsertAdminProfile(nextProfile).catch((error) => {
          console.error("[Store] updateProfile error:", error);
        });
      },

      // ============================================
      // WRITINGS
      // ============================================
      writings: [],
      fetchWritings: async () => {
        try {
          const data = await api.fetchWritings();
          set({ writings: (data || []).map((w: any) => ({ ...w, status: w.status || "published", content: "" })) });
        } catch (error) {
          console.error("[Store] fetchWritings error:", error);
        }
      },
      fetchWritingContent: async (id: string) => {
        try {
          const content = await api.fetchWritingContent(id);
          set((state) => ({
            writings: state.writings.map((item) =>
              item.id === id ? { ...item, content } : item
            ),
          }));
          return content;
        } catch (error) {
          console.error("[Store] fetchWritingContent error:", error);
          return "";
        }
      },
      addWriting: async (writing) => {
        const id = createLocalId();
        const date = new Date().toISOString().split("T")[0];
        const optimisticWriting = { ...writing, id, date } as Writing;

        // Optimistic update - show immediately
        set((state) => ({ writings: [optimisticWriting, ...state.writings] }));

        try {
          await api.createWriting({ ...writing, id, date });
        } catch (error) {
          console.error("[Store] addWriting error:", error);
          // Rollback on error
          set((state) => ({ writings: state.writings.filter((item) => item.id !== id) }));
        }
      },
      updateWriting: async (id, writing) => {
        const previousWritings = get().writings;

        // Optimistic update
        set((state) => ({
          writings: state.writings.map((item) => (item.id === id ? { ...item, ...writing } : item)),
        }));

        try {
          await api.updateWriting(id, writing);
        } catch (error) {
          console.error("[Store] updateWriting error:", error);
          // Rollback on error
          set({ writings: previousWritings });
        }
      },
      deleteWriting: async (id) => {
        const previousWritings = get().writings;

        // Optimistic update
        set((state) => ({ writings: state.writings.filter((item) => item.id !== id) }));

        try {
          await api.deleteWriting(id);
        } catch (error) {
          console.error("[Store] deleteWriting error:", error);
          // Rollback on error
          set({ writings: previousWritings });
        }
      },

      // ============================================
      // BOOKS
      // ============================================
      books: [],
      fetchBooks: async () => {
        try {
          const data = await api.fetchBooks();
          set({ books: (data || []).map((b: any) => ({ ...b, pdf: b.pdf ?? null })) });
        } catch (error) {
          console.error("[Store] fetchBooks error:", error);
        }
      },
      fetchBookPdf: async (id: string) => {
        try {
          const pdf = await api.fetchBookPdf(id);
          set((state) => ({
            books: state.books.map((item) => (item.id === id ? { ...item, pdf } : item)),
          }));
          return pdf;
        } catch (error) {
          console.error("[Store] fetchBookPdf error:", error);
          return null;
        }
      },
      addBook: async (book) => {
        const id = createLocalId();
        const created_at = new Date().toISOString();
        const newBook = { ...book, id, created_at };
        // Optimistic update
        set((state) => ({ books: [newBook, ...state.books] }));
        try {
          await api.createBook({ ...book, id, created_at });
        } catch (error) {
          console.error("[Store] addBook error:", error);
          set((state) => ({ books: state.books.filter((item) => item.id !== id) }));
          throw error;
        }
      },
      updateBook: async (id, book) => {
        const previousBooks = get().books;
        // Optimistic update
        set((state) => ({
          books: state.books.map((item) => (item.id === id ? { ...item, ...book } : item)),
        }));
        try {
          await api.updateBook(id, book);
        } catch (error) {
          console.error("[Store] updateBook error:", error);
          set({ books: previousBooks });
          throw error;
        }
      },
      deleteBook: async (id) => {
        const previousBooks = get().books;
        // Optimistic update
        set((state) => ({ books: state.books.filter((item) => item.id !== id) }));
        try {
          await api.deleteBook(id);
        } catch (error) {
          console.error("[Store] deleteBook error:", error);
          set({ books: previousBooks });
        }
      },

      // ============================================
      // SUGGESTIONS
      // ============================================
      suggestions: [],
      fetchSuggestions: async () => {
        try {
          const data = await api.fetchSuggestions();
          set({ suggestions: data || [] });
        } catch (error) {
          console.error("[Store] fetchSuggestions error:", error);
        }
      },
      addSuggestion: async (suggestion) => {
        const id = createLocalId();
        const created_at = new Date().toISOString();
        // Optimistic update - show immediately
        set((state) => ({ suggestions: [{ ...suggestion, id, created_at }, ...state.suggestions] }));
        try {
          await api.createSuggestion({ ...suggestion, id, created_at });
        } catch (error) {
          console.error("[Store] addSuggestion error:", error);
          // Rollback on error
          set((state) => ({ suggestions: state.suggestions.filter((item) => item.id !== id) }));
        }
      },
      updateSuggestion: async (id, suggestion) => {
        // Store previous state for rollback
        const previousSuggestions = get().suggestions;
        // Optimistic update
        set((state) => ({
          suggestions: state.suggestions.map((item) => (item.id === id ? { ...item, ...suggestion } : item)),
        }));
        try {
          await api.updateSuggestion(id, suggestion);
        } catch (error) {
          console.error("[Store] updateSuggestion error:", error);
          // Rollback on error
          set({ suggestions: previousSuggestions });
        }
      },
      deleteSuggestion: async (id) => {
        // Store previous state for rollback
        const previousSuggestions = get().suggestions;
        // Optimistic update
        set((state) => ({ suggestions: state.suggestions.filter((item) => item.id !== id) }));
        try {
          await api.deleteSuggestion(id);
        } catch (error) {
          console.error("[Store] deleteSuggestion error:", error);
          // Rollback on error
          set({ suggestions: previousSuggestions });
        }
      },

      // ============================================
      // POLLS
      // ============================================
      polls: [],
      fetchPolls: async () => {
        try {
          const data = await api.fetchPolls();
          set({ polls: data || [] });
        } catch (error) {
          console.error("[Store] fetchPolls error:", error);
        }
      },
      addPoll: async (poll) => {
        try {
          const id = createLocalId();
          const options = poll.options
            .filter((option) => option.text.trim())
            .map((option) => ({ ...option, id: option.id || createLocalId(), votes: 0 }));

          await api.createPoll({
            id,
            question: poll.question,
            totalVotes: 0,
            views: poll.views ?? 0,
            options,
          });

          set((state) => ({
            polls: [{ id, question: poll.question, options, totalVotes: 0, views: poll.views ?? 0 }, ...state.polls],
          }));
        } catch (error) {
          console.error("[Store] addPoll error:", error);
        }
      },
      updatePoll: async (id, poll) => {
        try {
          await api.updatePoll(id, poll);
          set((state) => ({
            polls: state.polls.map((item) => {
              if (item.id !== id) return item;
              return {
                ...item,
                ...poll,
                views: poll.views !== undefined ? poll.views : item.views,
                totalVotes:
                  poll.options?.reduce((sum, option) => sum + (option.votes ?? 0), 0) ?? item.totalVotes,
              };
            }),
          }));
        } catch (error) {
          console.error("[Store] updatePoll error:", error);
        }
      },
      deletePoll: async (id) => {
        try {
          await api.deletePoll(id);
          set((state) => ({ polls: state.polls.filter((item) => item.id !== id) }));
        } catch (error) {
          console.error("[Store] deletePoll error:", error);
        }
      },
      votePoll: async (pollId, optionId) => {
        try {
          await api.votePollOption(pollId, optionId);
          set((state) => ({
            polls: state.polls.map((item) => {
              if (item.id !== pollId) return item;
              return {
                ...item,
                totalVotes: item.totalVotes + 1,
                options: item.options.map((option) =>
                  option.id === optionId ? { ...option, votes: option.votes + 1 } : option
                ),
              };
            }),
          }));
        } catch (error) {
          console.error("[Store] votePoll error:", error);
        }
      },

      // ============================================
      // INTERVIEWS
      // ============================================
      interviews: [],
      fetchInterviews: async () => {
        try {
          const data = await api.fetchInterviews();
          set({ interviews: data || [] });
        } catch (error) {
          console.error("[Store] fetchInterviews error:", error);
        }
      },
      fetchInterviewDialogues: async (id: string) => {
        try {
          const dialogues = await api.fetchInterviewDialogues(id);
          set((state) => ({
            interviews: state.interviews.map((item) =>
              item.id === id ? { ...item, dialogues } : item
            ),
          }));
          return dialogues;
        } catch (error) {
          console.error("[Store] fetchInterviewDialogues error:", error);
          return [];
        }
      },
      addInterview: async (interview) => {
        try {
          const id = createLocalId();
          const dialogues = interview.dialogues.map((dialogue) => ({
            ...dialogue,
            id: dialogue.id || createLocalId(),
          }));

          const created_at = new Date().toISOString();
          await api.createInterview({ ...interview, id, dialogues, created_at });
          set((state) => ({ interviews: [{ ...interview, id, dialogues, created_at }, ...state.interviews] }));
        } catch (error) {
          console.error("[Store] addInterview error:", error);
        }
      },
      updateInterview: async (id, interview) => {
        try {
          await api.updateInterview(id, interview);
          set((state) => ({
            interviews: state.interviews.map((item) => {
              if (item.id !== id) return item;
              // Preserve existing dialogues if not provided or empty in update
              const updated = { ...item, ...interview };
              if ((!interview.dialogues || interview.dialogues.length === 0) && item.dialogues?.length > 0) {
                updated.dialogues = item.dialogues;
              }
              return updated;
            }),
          }));
        } catch (error) {
          console.error("[Store] updateInterview error:", error);
        }
      },
      deleteInterview: async (id) => {
        try {
          await api.deleteInterview(id);
          set((state) => ({ interviews: state.interviews.filter((item) => item.id !== id) }));
        } catch (error) {
          console.error("[Store] deleteInterview error:", error);
        }
      },

      // ============================================
      // ANNOUNCEMENTS
      // ============================================
      announcements: [],
      fetchAnnouncements: async () => {
        try {
          const data = await api.fetchAnnouncements();
          set({ announcements: data || [] });
        } catch (error) {
          console.error("[Store] fetchAnnouncements error:", error);
        }
      },
      addAnnouncement: async (announcement) => {
        const id = createLocalId();
        const date = new Date().toISOString().split("T")[0];
        const optimisticAnnouncement = { ...announcement, id, date } as Announcement;

        // Optimistic update - show immediately
        set((state) => ({
          announcements: [optimisticAnnouncement, ...state.announcements],
        }));

        try {
          await api.createAnnouncement({ ...announcement, id, date });
        } catch (error) {
          console.error("[Store] addAnnouncement error:", error);
          // Rollback on error
          set((state) => ({ announcements: state.announcements.filter((item) => item.id !== id) }));
        }
      },
      updateAnnouncement: async (id, announcement) => {
        const previousAnnouncements = get().announcements;

        // Optimistic update
        set((state) => ({
          announcements: state.announcements.map((item) =>
            item.id === id ? { ...item, ...announcement } : item
          ),
        }));

        try {
          await api.updateAnnouncement(id, announcement);
        } catch (error) {
          console.error("[Store] updateAnnouncement error:", error);
          // Rollback on error
          set({ announcements: previousAnnouncements });
        }
      },
      deleteAnnouncement: async (id) => {
        const previousAnnouncements = get().announcements;

        // Optimistic update
        set((state) => ({ announcements: state.announcements.filter((item) => item.id !== id) }));

        try {
          await api.deleteAnnouncement(id);
        } catch (error) {
          console.error("[Store] deleteAnnouncement error:", error);
          // Rollback on error
          set({ announcements: previousAnnouncements });
        }
      },

      // ============================================
      // DARK MODE
      // ============================================
      darkMode: false,
      toggleDarkMode: () => {
        set((state) => {
          const next = !state.darkMode;
          if (next) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          return { darkMode: next };
        });
      },
    }),
    {
      name: "kitapkurdu-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        adminProfile: state.adminProfile,
        darkMode: state.darkMode,
      }),
    }
  )
);
