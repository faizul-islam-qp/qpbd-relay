import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { requestsApi } from '@/api/requests'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatDistanceToNow } from 'date-fns'
import { Send, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnreadComments } from '@/store/unreadComments'

interface Props {
  requestId: string
  compact?: boolean
}

export function RequestComments({ requestId, compact }: Props) {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const markRead = useUnreadComments((s) => s.markRead)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    markRead(requestId)
  }, [requestId, markRead])

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', requestId],
    queryFn: () => requestsApi.getComments(requestId),
    refetchInterval: 15_000,
  })

  const mutation = useMutation({
    mutationFn: (content: string) => requestsApi.addComment(requestId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', requestId] })
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [comments.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    mutation.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const trimmed = text.trim()
      if (trimmed) mutation.mutate(trimmed)
    }
  }

  const roleLabel = (role: string) => {
    if (role === 'staff') return '🛠️ Staff'
    if (role === 'admin') return '👑 Admin'
    return '👔 Employee'
  }

  return (
    <div className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-4 w-4" />
        Comments {comments.length > 0 && <span className="text-foreground">({comments.length})</span>}
      </div>

      {/* Comment list */}
      <div className={cn(
        'space-y-2 overflow-y-auto',
        compact ? 'max-h-52' : 'max-h-72',
      )}>
        {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No comments yet. Start the conversation.</p>
        )}
        {comments.map((c: any) => {
          const isMe = c.author?.id === user?.id
          return (
            <div key={c.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
              <div className={cn(
                'max-w-[80%] rounded-xl px-3 py-2 text-sm',
                isMe
                  ? 'bg-primary text-primary-foreground rounded-tr-none'
                  : 'bg-muted rounded-tl-none',
              )}>
                {!isMe && (
                  <p className="text-xs font-medium mb-0.5 opacity-70">
                    {c.author?.name ?? 'Unknown'} · {roleLabel(c.author?.role)}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{c.content}</p>
                <p className={cn('text-xs mt-1 opacity-60', isMe ? 'text-right' : '')}>
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a comment… (Enter to send, Shift+Enter for newline)"
          className="resize-none text-sm min-h-[2.5rem] max-h-32"
          rows={1}
        />
        <Button type="submit" size="icon" disabled={!text.trim() || mutation.isPending} className="flex-shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
