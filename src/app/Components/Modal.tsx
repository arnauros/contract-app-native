import React from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  confirmButtonStyle?: string;
  cancelText?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = "Confirm",
  confirmButtonStyle = "px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700",
  cancelText = "Cancel",
}) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[99999]" />
      <div className="fixed inset-0 flex items-center justify-center z-[100000]">
        <div className="bg-white rounded-lg p-6 w-[400px] shadow-xl">
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
          <div className="mb-4">{children}</div>
          {onConfirm && (
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={confirmButtonStyle}
              >
                {confirmText}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default Modal;
