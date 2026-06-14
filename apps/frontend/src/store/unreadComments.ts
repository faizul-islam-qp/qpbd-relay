import { create } from 'zustand'

interface UnreadCommentsStore {
  unread: Record<string, true>
  markUnread: (requestId: string) => void
  markRead: (requestId: string) => void
  hasUnread: (requestId: string) => boolean
}

export const useUnreadComments = create<UnreadCommentsStore>((set, get) => ({
  unread: {},
  markUnread: (requestId) => set((s) => ({ unread: { ...s.unread, [requestId]: true } })),
  markRead: (requestId) => set((s) => {
    const next = { ...s.unread }
    delete next[requestId]
    return { unread: next }
  }),
  hasUnread: (requestId) => !!get().unread[requestId],
}))
