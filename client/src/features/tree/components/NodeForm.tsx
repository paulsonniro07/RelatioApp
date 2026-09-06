import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { resolveApiPhotoUrl } from '@/lib/api';
import { wouldCreateCycle } from '@/features/tree/store';
import type { ChartMode, NodePhotoDraft, TreeNode, TreeNodeInput } from '@/features/tree/types';

import { preparePhotoFile } from '../photo';
import { NodeSelect } from './NodeSelect';
import { RelationshipSelect } from './RelationshipSelect';

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

interface NodeFormProps {
  open: boolean;
  mode: 'add' | 'edit';
  chartMode: ChartMode;
  node: TreeNode | null;
  nodes: TreeNode[];
  defaultParentId: string | null;
  onClose: () => void;
  onSubmit: (
    input: TreeNodeInput,
    editingId: string | null,
    photo: NodePhotoDraft,
  ) => void | Promise<void>;
}

export function NodeForm({
  open,
  mode,
  chartMode,
  node,
  nodes,
  defaultParentId,
  onClose,
  onSubmit,
}: NodeFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [level, setLevel] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [siblingOfId, setSiblingOfId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoRemove, setPhotoRemove] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef('');

  useEffect(() => {
    if (!open) return;
    const source = mode === 'edit' ? node : null;
    setName(source?.name ?? '');
    setRole(source?.role ?? '');
    setLevel(source?.level ?? '');
    setParentId(mode === 'edit' ? (source?.parentId ?? null) : defaultParentId);
    setSiblingOfId(null);
    setPartnerId(mode === 'edit' ? (source?.partnerId ?? null) : null);
    setNotes(source?.notes ?? '');
    setErrors({});
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoRemove(false);
    setPhotoError('');
    revokeObjectUrl();
  }, [open, mode, node, defaultParentId]);

  // Release the preview object URL when the form unmounts.
  useEffect(() => () => revokeObjectUrl(), []);

  /** A manual parent choice supersedes the sibling shortcut. */
  const handleParentChange = (value: string | null) => {
    setParentId(value);
    setSiblingOfId(null);
  };

  /** Choosing a sibling re-points this node at the chosen person's parent. */
  const handleSiblingChange = (value: string | null) => {
    setSiblingOfId(value);
    if (value) {
      const sibling = nodes.find((n) => n.id === value);
      if (sibling) setParentId(sibling.parentId);
    }
  };

  // People this node can become a sibling of — excludes itself and anyone whose
  // shared parent would create a cycle (e.g. one of its own descendants).
  const siblingCandidates = useMemo(() => {
    const selfId = mode === 'edit' ? node?.id : null;
    if (!selfId) return nodes;
    return nodes.filter(
      (candidate) =>
        candidate.id !== selfId &&
        (candidate.parentId === null ||
          !wouldCreateCycle(nodes, selfId, candidate.parentId)),
    );
  }, [nodes, mode, node?.id]);

  const revokeObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
  };

  const setPreviewFor = (file: File | null) => {
    revokeObjectUrl();
    if (file) {
      objectUrlRef.current = URL.createObjectURL(file);
      setPhotoPreview(objectUrlRef.current);
    } else {
      setPhotoPreview('');
    }
  };

  const handlePhotoPicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    setPhotoError('');
    if (!file) return;
    try {
      const prepared = await preparePhotoFile(file);
      setPhotoFile(prepared);
      setPhotoRemove(false);
      setPreviewFor(prepared);
    } catch (err) {
      setPhotoFile(null);
      setPhotoRemove(false);
      setPreviewFor(null);
      setPhotoError(err instanceof Error ? err.message : 'Could not read that image.');
    }
  };

  const handleRemovePhoto = () => {
    if (photoFile) {
      setPhotoFile(null);
      setPreviewFor(null);
      setPhotoError('');
      return;
    }
    setPhotoRemove(true);
  };

  const existingPhoto = mode === 'edit' ? (node?.photoUrl ?? null) : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) nextErrors.name = 'Name is required';
    if (
      mode === 'edit' &&
      node &&
      parentId !== null &&
      wouldCreateCycle(nodes, node.id, parentId)
    ) {
      nextErrors.parent = 'Cannot set a descendant as parent';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit(
        {
          name: trimmedName,
          parentId,
          partnerId,
          // Family charts have no manual level — generation is the tree itself.
          level: chartMode === 'family' ? '' : level.trim(),
          role: role.trim(),
          notes: notes.trim(),
          // The upload endpoint owns the photo; preserve the existing value here
          // unless there is none (new node).
          photoUrl: mode === 'edit' ? (node?.photoUrl ?? null) : null,
        },
        mode === 'edit' && node ? node.id : null,
        { file: photoFile, remove: photoRemove },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={mode === 'edit' ? 'Edit node' : 'Add node'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          required
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
          placeholder="e.g. Alex Rivera"
        />
        <RelationshipSelect
          label={chartMode === 'org' ? 'Job title' : 'Relationship'}
          chartMode={chartMode}
          value={role}
          onChange={setRole}
        />
        {chartMode === 'org' && (
          <Input
            label="Rank / tier"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            hint="Optional grouping band for the legend — e.g. Executive, Management, Staff"
            placeholder="e.g. Executive"
          />
        )}
        <NodeSelect
          label="Parent"
          nodes={nodes}
          value={parentId}
          onChange={handleParentChange}
          excludeId={mode === 'edit' ? node?.id : undefined}
          hint={
            chartMode === 'family'
              ? 'Children belong to this parent — leave empty for root'
              : 'Leave empty to make this a root node'
          }
          error={errors.parent}
        />
        {chartMode === 'family' && (
          <NodeSelect
            label="Sibling of"
            nodes={siblingCandidates}
            value={siblingOfId}
            onChange={handleSiblingChange}
            noneLabel="No sibling"
            clearLabel="Clear sibling"
            placeholder="Search people…"
            hint="Picks the same parent as the chosen person, making them siblings."
          />
        )}
        {chartMode === 'family' && (
          <NodeSelect
            label="Partner / spouse"
            nodes={nodes}
            value={partnerId}
            onChange={setPartnerId}
            excludeId={mode === 'edit' ? node?.id : undefined}
            hint="Link as spouse — children attach to the Parent above"
          />
        )}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Photo</label>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-sm font-semibold text-gray-500 ring-1 ring-gray-200">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="h-full w-full object-cover" />
              ) : existingPhoto && !photoRemove ? (
                <img
                  src={resolveApiPhotoUrl(existingPhoto)}
                  alt={name.trim() || 'Current photo'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span aria-hidden="true">{initials(name.trim())}</span>
              )}
            </div>
            <div className="flex flex-col items-start gap-1.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {existingPhoto && !photoRemove ? 'Change photo' : 'Upload photo'}
              </Button>
              {(photoFile || (existingPhoto && !photoRemove)) && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Remove photo
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handlePhotoPicked(event)}
              />
            </div>
          </div>
          {photoError ? (
            <p className="text-sm text-red-600">{photoError}</p>
          ) : photoFile ? (
            <p className="text-xs text-gray-500">New photo will be uploaded when you save.</p>
          ) : photoRemove ? (
            <p className="text-xs text-gray-500">Current photo will be removed when you save.</p>
          ) : (
            <p className="text-xs text-gray-500">JPG, PNG, WebP or GIF — up to 5 MB.</p>
          )}
        </div>
        <Textarea
          label="Notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          placeholder="Optional notes…"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {mode === 'edit' ? 'Save changes' : 'Add node'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
