import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { resolveApiPhotoUrl } from '@/lib/api';
import {
  chartTypeUsesLevels,
  findRelationshipDef,
  findRelationshipOption,
  inferRelationshipId,
  relationshipLabelForValue,
} from '@/features/tree/chartTypes';
import { wouldCreateCycle } from '@/features/tree/store';
import type {
  ChartType,
  NodePhotoDraft,
  RelationshipTypeDef,
  TreeNode,
  TreeNodeInput,
} from '@/features/tree/types';

import { preparePhotoFile } from '../photo';
import { NodeSelect } from './NodeSelect';
import { RelationshipSelect } from './RelationshipSelect';
import { RelationshipTypeForm } from './RelationshipTypeForm';

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || '?';
}

export interface NodeFormSubmitOptions {
  /** Node that should be reparented under the newly created node (forward hier.). */
  reparentNodeId?: string;
}

interface NodeFormProps {
  open: boolean;
  mode: 'add' | 'edit';
  chartType: ChartType;
  node: TreeNode | null;
  nodes: TreeNode[];
  defaultParentId: string | null;
  onClose: () => void;
  onCreateRelationshipType?: (def: RelationshipTypeDef) => Promise<void>;
  onSubmit: (
    input: TreeNodeInput,
    editingId: string | null,
    photo: NodePhotoDraft,
    options?: NodeFormSubmitOptions,
  ) => void | Promise<void>;
}

export function NodeForm({
  open,
  mode,
  chartType,
  node,
  nodes,
  defaultParentId,
  onClose,
  onCreateRelationshipType,
  onSubmit,
}: NodeFormProps) {
  const [name, setName] = useState('');
  const [relationshipValue, setRelationshipValue] = useState('');
  const [relationshipTouched, setRelationshipTouched] = useState(false);
  const [relatedId, setRelatedId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [level, setLevel] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [sequence, setSequence] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [addingRel, setAddingRel] = useState(false);
  const [savingRel, setSavingRel] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoRemove, setPhotoRemove] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef('');

  const usesLevels = chartTypeUsesLevels(chartType);
  const allowsPartners = chartType.relationships.some((def) => def.link === 'partner');

  /** Best-effort relationship selection for an existing node. */
  const initialRelationshipValue = useMemo(() => {
    if (mode !== 'edit' || !node) return '';
    const def = findRelationshipDef(chartType, node.relationshipTypeId);
    if (def) {
      if (def.link === 'partner' && node.partnerId) return `${def.id}:lateral`;
      if (def.link === 'shared-parent' && node.parentId) return `${def.id}:lateral`;
      if (def.link === 'parent') {
        if (node.parentId) return `${def.id}:backward`;
        if (nodes.some((n) => n.parentId === node.id)) return `${def.id}:forward`;
      }
      return def.directional ? `${def.id}:forward` : `${def.id}:lateral`;
    }
    return node.role;
  }, [mode, node, chartType, nodes]);

  useEffect(() => {
    if (!open) return;
    const source = mode === 'edit' ? node : null;
    setName(source?.name ?? '');
    setRelationshipValue(initialRelationshipValue);
    setRelationshipTouched(false);
    setRelatedId(mode === 'edit' ? null : defaultParentId);
    setParentId(mode === 'edit' ? (source?.parentId ?? null) : null);
    setPartnerId(mode === 'edit' ? (source?.partnerId ?? null) : null);
    setLevel(source?.level ?? '');
    setBirthDate(source?.birthDate ?? '');
    setSequence(source?.sequence != null ? String(source.sequence) : '');
    setNotes(source?.notes ?? '');
    setErrors({});
    setSaving(false);
    setDetailsOpen(false);
    setAddingRel(false);
    setSavingRel(false);
    setPhotoFile(null);
    setPhotoPreview('');
    setPhotoRemove(false);
    setPhotoError('');
    revokeObjectUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, node, defaultParentId, initialRelationshipValue]);

  // Release the preview object URL when the form unmounts.
  useEffect(() => () => revokeObjectUrl(), []);

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

  const handleSaveNewRelationshipType = async (def: RelationshipTypeDef) => {
    if (!onCreateRelationshipType) return;
    setSavingRel(true);
    try {
      await onCreateRelationshipType(def);
      setRelationshipValue(`${def.id}:${def.directional ? 'forward' : 'lateral'}`);
      setRelationshipTouched(true);
      setAddingRel(false);
    } finally {
      setSavingRel(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) nextErrors.name = 'Name is required';

    const option = findRelationshipOption(chartType, relationshipValue);

    let resolvedParentId: string | null;
    let resolvedPartnerId: string | null;
    let resolvedRole: string;
    let resolvedRelationshipTypeId: string | null;
    let reparentNodeId: string | undefined;

    if (mode === 'add') {
      resolvedParentId = null;
      resolvedPartnerId = null;
      if (relationshipValue && nodes.length > 0 && !relatedId) {
        nextErrors.relationship = 'Choose who to relate to';
      }
      if (option && relatedId) {
        const related = nodes.find((n) => n.id === relatedId) ?? null;
        resolvedRole = option.label;
        resolvedRelationshipTypeId = option.relationshipId;
        if (option.link === 'parent') {
          if (option.direction === 'forward') {
            resolvedParentId = related?.parentId ?? null;
            reparentNodeId = relatedId;
          } else {
            resolvedParentId = relatedId;
          }
        } else if (option.link === 'partner') {
          resolvedPartnerId = relatedId;
        } else {
          // shared-parent: true siblings share a parent. When the anchor is a
          // root (no parent to share), fall back to a lateral link so the two
          // still connect instead of silently becoming two separate roots.
          if (related?.parentId) {
            resolvedParentId = related.parentId;
          } else {
            resolvedPartnerId = relatedId;
          }
        }
      } else {
        resolvedRole = '';
        resolvedRelationshipTypeId = null;
      }
    } else {
      resolvedParentId = parentId;
      resolvedPartnerId = partnerId;
      if (
        node &&
        parentId !== null &&
        wouldCreateCycle(nodes, node.id, parentId)
      ) {
        nextErrors.parent = 'Cannot set a descendant as parent';
      }
      if (!relationshipTouched && node) {
        resolvedRole = node.role;
        resolvedRelationshipTypeId = node.relationshipTypeId;
      } else if (option) {
        resolvedRole = option.label;
        resolvedRelationshipTypeId = option.relationshipId;
      } else {
        const raw = relationshipValue.trim();
        if (raw.includes(':')) {
          // Stale "<relId>:<direction>" key — resolve to its human label so the
          // internal key is never stored as the card's role.
          resolvedRole = relationshipLabelForValue(chartType, raw, node?.role ?? '');
          resolvedRelationshipTypeId = inferRelationshipId(chartType, resolvedRole);
        } else {
          resolvedRole = raw;
          resolvedRelationshipTypeId = inferRelationshipId(chartType, resolvedRole);
        }
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit(
        {
          name: trimmedName,
          parentId: resolvedParentId,
          partnerId: resolvedPartnerId,
          level: usesLevels ? level.trim() : '',
          role: resolvedRole,
          relationshipTypeId: resolvedRelationshipTypeId,
          birthDate: birthDate.trim() || null,
          sequence:
            sequence.trim() === '' || !Number.isFinite(Number(sequence))
              ? null
              : Number(sequence),
          notes: notes.trim(),
          photoUrl: mode === 'edit' ? (node?.photoUrl ?? null) : null,
        },
        mode === 'edit' && node ? node.id : null,
        { file: photoFile, remove: photoRemove },
        reparentNodeId ? { reparentNodeId } : undefined,
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

        {nodes.length > 0 && (
          <>
            <RelationshipSelect
              label={mode === 'add' ? 'Add as' : 'Relationship'}
              chartType={chartType}
              value={relationshipValue}
              onChange={(value) => {
                setRelationshipValue(value);
                setRelationshipTouched(true);
              }}
              onAddRelationshipType={
                onCreateRelationshipType ? () => setAddingRel(true) : undefined
              }
              allowCustomValue={mode === 'edit' ? (node?.role ?? '') : undefined}
              error={errors.relationship}
            />
            {addingRel && (
              <RelationshipTypeForm
                existingIds={chartType.relationships.map((def) => def.id)}
                onSave={handleSaveNewRelationshipType}
                onCancel={() => setAddingRel(false)}
                saving={savingRel}
              />
            )}
            {mode === 'add' && relationshipValue && (
              <NodeSelect
                label="of"
                nodes={nodes}
                value={relatedId}
                onChange={setRelatedId}
                noneLabel="— none —"
                clearLabel="Clear person"
                placeholder="Search people…"
                hint="Pick the existing person this new node relates to."
              />
            )}
          </>
        )}

        <div className="rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
          >
            Details
            <span className="text-xs text-gray-400">{detailsOpen ? 'Hide' : 'Show'}</span>
          </button>
          {detailsOpen && (
            <div className="space-y-4 border-t border-gray-200 p-3">
              {mode === 'edit' && (
                <NodeSelect
                  label="Parent"
                  nodes={nodes}
                  value={parentId}
                  onChange={setParentId}
                  excludeId={node?.id}
                  hint="Leave empty to make this a root node"
                  error={errors.parent}
                />
              )}
              {mode === 'edit' && allowsPartners && (
                <NodeSelect
                  label="Partner / lateral link"
                  nodes={nodes}
                  value={partnerId}
                  onChange={setPartnerId}
                  excludeId={node?.id}
                  noneLabel="No partner"
                  hint="Links this node beside the chosen person."
                />
              )}
              {usesLevels && (
                <Input
                  label="Rank / tier"
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  hint="Optional grouping band for the legend - e.g. Executive, Management, Staff"
                  placeholder="e.g. Executive"
                />
              )}
              <Input
                label="Birthday"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                hint="Optional — used by the Birthday sort order."
              />
              <Input
                label="Sequence"
                type="number"
                inputMode="numeric"
                value={sequence}
                onChange={(event) => setSequence(event.target.value)}
                hint="Optional manual order within its row. Lower numbers come first."
                placeholder="e.g. 1"
              />
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
            </div>
          )}
        </div>

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
