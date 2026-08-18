import { Modal } from './Modal';

export function ComingSoonModal({
  title,
  message,
  onClose,
}: {
  title: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="booking-section-hint">{message ?? "We're working on this feature. Check back soon!"}</p>
      <button type="button" className="btn btn-primary full" onClick={onClose}>Close</button>
    </Modal>
  );
}
