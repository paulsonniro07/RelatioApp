import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/errors';
import { useTreeChart } from '@/hooks/useTreeChart';
import type { TreeNode } from '@/features/tree/types';

import { NodeSelect } from './NodeSelect';

interface LinkNodeDialogProps {
  open: boolean;
  /** The source node being linked (in the active chart). */
  node: TreeNode | null;
  onClose: () => void;
}

/** Picks a target chart + node and links the source node to it. */
export function LinkNodeDialog({ open, node, onClose }: LinkNodeDialogProps) {
  const { chart, charts, loadChartNodes, linkNode, unlinkNode, copyLinkedNode } =
    useTreeChart();
  const { success: toastSuccess, error: toastError } = useToast();

  const [targetChartId, setTargetChartId] = useState('');
  const [targetNodes, setTargetNodes] = useState<TreeNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const otherCharts = charts.filter((c) => c.id !== chart?.id);
  const linkedRef = node?.linkedNodeRef ?? null;

  useEffect(() => {
    if (!open || !node) return;
    setError('');
    setSaving(false);
    setSelectedNodeId(linkedRef?.nodeId ?? null);
    const initialChartId = linkedRef?.chartId ?? '';
    setTargetChartId(initialChartId);
    if (!initialChartId) {
      setTargetNodes([]);
      return;
    }
    setLoading(true);
    void loadChartNodes(initialChartId)
      .then((nodes) => setTargetNodes(nodes))
      .catch(() => {
        setTargetNodes([]);
        setError('Linked chart no longer exists');
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, node?.id]);

  const handleChartChange = (chartId: string) => {
    setTargetChartId(chartId);
    setSelectedNodeId(null);
    setError('');
    if (!chartId) {
      setTargetNodes([]);
      return;
    }
    setLoading(true);
    void loadChartNodes(chartId)
      .then((nodes) => setTargetNodes(nodes))
      .catch(() => {
        setTargetNodes([]);
        setError(getErrorMessage(null, 'Could not load that chart'));
      })
      .finally(() => setLoading(false));
  };

  const handleConfirm = async () => {
    if (!node) return;
    if (!targetChartId || !selectedNodeId) {
      setError('Choose a chart and a node to link to');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await linkNode(node.id, targetChartId, selectedNodeId);
      toastSuccess('Charts linked');
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to link charts'));
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!node) return;
    setSaving(true);
    try {
      await unlinkNode(node.id);
      toastSuccess('Link removed');
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to unlink'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyNode = async () => {
    if (!node) return;
    setSaving(true);
    try {
      await copyLinkedNode(node.id);
      toastSuccess('Added a copy of the linked node');
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err, 'Failed to copy node'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Link to another chart" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Link <span className="font-medium text-gray-700">{node?.name}</span> to a node in
          another chart. Each node keeps its own data — this is navigation only.
        </p>

        {otherCharts.length === 0 ? (
          <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-sm text-gray-500">
            You need at least one other chart to create a link.
          </p>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700">
              Target chart
              <select
                value={targetChartId}
                onChange={(event) => handleChartChange(event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">— select a chart —</option>
                {otherCharts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            {targetChartId && (
              <NodeSelect
                label="Target node"
                nodes={targetNodes}
                value={selectedNodeId}
                onChange={setSelectedNodeId}
                noneLabel="— select a node —"
                clearLabel="Clear node"
                placeholder="Search people…"
                hint={loading ? 'Loading nodes…' : 'The node to jump to in that chart.'}
              />
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-between gap-2 pt-2">
          <div className="flex gap-2">
            {linkedRef && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={saving}
                onClick={() => void handleCopyNode()}
                title="Add a new node in this chart that copies the linked node, and link them"
              >
                Copy node here
              </Button>
            )}
            {linkedRef && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={saving}
                onClick={() => void handleUnlink()}
              >
                Unlink
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              loading={saving}
              disabled={otherCharts.length === 0}
              onClick={() => void handleConfirm()}
            >
              {linkedRef ? 'Update link' : 'Create link'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
