-- Atualizar RLS policies para permitir edição colaborativa de memórias

-- Permitir que usuários com compartilhamento direto possam editar memórias
CREATE POLICY "Users can update memories shared with them directly"
ON memories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memory_shares
    WHERE memory_shares.memory_id = memories.id
    AND (
      memory_shares.shared_with_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM group_members
        WHERE group_members.group_id = memory_shares.shared_with_group_id
        AND group_members.user_id = auth.uid()
      )
    )
  )
);

-- Permitir que usuários com compartilhamento na árvore possam editar memórias
CREATE POLICY "Users can update memories shared with tree"
ON memories
FOR UPDATE
TO authenticated
USING (
  share_with_tree = true
  AND EXISTS (
    SELECT 1 FROM connections
    WHERE (
      (connections.requester_id = auth.uid() AND connections.receiver_id = memories.user_id AND connections.status = 'accepted')
      OR (connections.receiver_id = auth.uid() AND connections.requester_id = memories.user_id AND connections.status = 'accepted')
    )
  )
);

-- Permitir que usuários compartilhados possam adicionar media às memórias
CREATE POLICY "Shared users can add media to memories"
ON memory_media
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memories
    WHERE memories.id = memory_media.memory_id
    AND (
      memories.user_id = auth.uid()
      OR memories.share_with_tree = true
      OR EXISTS (
        SELECT 1 FROM memory_shares
        WHERE memory_shares.memory_id = memories.id
        AND (
          memory_shares.shared_with_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = memory_shares.shared_with_group_id
            AND group_members.user_id = auth.uid()
          )
        )
      )
    )
  )
);

-- Permitir que usuários compartilhados possam deletar media das memórias
CREATE POLICY "Shared users can delete media from memories"
ON memory_media
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memories
    WHERE memories.id = memory_media.memory_id
    AND (
      memories.user_id = auth.uid()
      OR memories.share_with_tree = true
      OR EXISTS (
        SELECT 1 FROM memory_shares
        WHERE memory_shares.memory_id = memories.id
        AND (
          memory_shares.shared_with_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM group_members
            WHERE group_members.group_id = memory_shares.shared_with_group_id
            AND group_members.user_id = auth.uid()
          )
        )
      )
    )
  )
);