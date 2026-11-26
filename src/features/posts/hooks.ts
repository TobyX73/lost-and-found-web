import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '../../lib/auth'
import { createPost, getMatches, getPost, listPosts, setPostStatus, submitClaim } from './posts-api'
import type { CreatePostInput, PostFilters, PostStatus } from './types'

export const postKeys = {
  all: ['posts'] as const,
  list: (filters: PostFilters) => ['posts', 'list', filters] as const,
  detail: (id: string) => ['posts', 'detail', id] as const,
  matches: (id: string) => ['posts', 'matches', id] as const,
}

export function usePosts(filters: PostFilters) {
  return useQuery({
    queryKey: postKeys.list(filters),
    queryFn: () => listPosts(filters),
    placeholderData: (previous) => previous,
  })
}

export function usePost(id: string) {
  return useQuery({ queryKey: postKeys.detail(id), queryFn: () => getPost(id), retry: false })
}

export function useMatches(id: string) {
  return useQuery({ queryKey: postKeys.matches(id), queryFn: () => getMatches(id) })
}

export function useCreatePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, author }: { input: CreatePostInput; author: User }) => createPost(input, author),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  })
}

export function useSetPostStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PostStatus }) => setPostStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  })
}

export function useSubmitClaim() {
  return useMutation({
    mutationFn: ({ postId, answers }: { postId: string; answers: { questionId: string; answer: string }[] }) =>
      submitClaim(postId, answers),
  })
}
