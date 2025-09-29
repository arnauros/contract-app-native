"use client";

import { useState } from "react";
import Modal from "../../Components/Modal";
import Button from "../../Components/button";

export default function TestModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold">Modal Test Page</h1>

        <div className="space-y-4">
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            Open Test Modal
          </Button>
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Test Modal"
          onConfirm={() => {
            console.log("Modal confirmed");
            setIsModalOpen(false);
          }}
        >
          <p>This is a test modal to showcase the functionality.</p>
        </Modal>
      </div>
    </div>
  );
}
