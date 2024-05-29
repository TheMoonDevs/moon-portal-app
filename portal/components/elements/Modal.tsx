import React, { useState, ChangeEvent } from "react";
import Modal from "react-modal";
import { Button } from "./Button";

const customStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  content: {
    width: "70%",
  },
};

interface GeneralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  defaultValues?: any;
  modalTitle?: string;
  children?: React.ReactNode;
}

const GeneralModal: React.FC<GeneralModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  modalTitle,
  children,
}) => {
  // State to track form data
  const [formData, setFormData] = useState<any>(defaultValues || {});

  // Handle input changes
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = () => {
    // You can perform any validation before submitting
    onSubmit(formData);
    // Close the modal after submission
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel={modalTitle || "Modal"}
      style={customStyles}
      ariaHideApp={false}
    >
      {children}
      <div className=" mt-7">
        <Button onClick={handleSubmit}>Submit</Button>
      </div>
    </Modal>
  );
};

export default GeneralModal;
