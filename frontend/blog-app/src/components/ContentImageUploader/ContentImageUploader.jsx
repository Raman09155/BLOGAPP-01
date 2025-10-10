import React, { useState, useRef } from "react";
import { LuUpload, LuChevronDown, LuChevronUp, LuImage, LuCopy, LuTrash2, LuSave, LuX } from "react-icons/lu";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import toast from "react-hot-toast";
import Modal from "../Modal";
import DeleteAlertContent from "../DeleteAlertContent";

const ContentImageUploader = ({ images, setImages }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, imageId: null, imageName: "" });

  const fileInputRef = useRef(null);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("name", file.name.split('.')[0]); // Use filename without extension as default name

        const response = await axiosInstance.post(API_PATHS.CONTENT_IMAGES.UPLOAD, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        setImages(prev => [response.data, ...prev]);
      }
      toast.success(`${files.length} image(s) uploaded successfully!`);
    } catch (error) {
      toast.error("Failed to upload images");
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
      event.target.value = ""; // Reset file input
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };



  const startEdit = (image) => {
    setEditingId(image._id);
    setEditName(image.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (imageId) => {
    if (!editName.trim()) {
      toast.error("Image name cannot be empty");
      return;
    }

    try {
      const response = await axiosInstance.put(API_PATHS.CONTENT_IMAGES.UPDATE(imageId), {
        name: editName.trim()
      });

      setImages(prev => prev.map(img => 
        img._id === imageId ? { ...img, name: response.data.name } : img
      ));
      
      setEditingId(null);
      setEditName("");
      toast.success("Image name updated successfully!");
    } catch (error) {
      toast.error("Failed to update image name");
      console.error("Update error:", error);
    }
  };

  const openDeleteModal = (image) => {
    setDeleteModal({ open: true, imageId: image._id, imageName: image.name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, imageId: null, imageName: "" });
  };

  const deleteImage = async () => {
    try {
      await axiosInstance.delete(API_PATHS.CONTENT_IMAGES.DELETE(deleteModal.imageId));
      setImages(prev => prev.filter(img => img._id !== deleteModal.imageId));
      toast.success("Image deleted successfully!");
      closeDeleteModal();
    } catch (error) {
      toast.error("Failed to delete image");
      console.error("Delete error:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        multiple
        className="hidden"
      />
      
      {/* Upload Images Button */}
      <button
        type="button"
        className="flex items-center gap-2.5 text-[13px] font-medium text-green-600 bg-green-50/60 rounded px-3 py-[3px] border border-green-100 hover:border-green-400 cursor-pointer hover:scale-[1.02] transition-all"
        onClick={handleFileSelect}
        disabled={uploading}
      >
        <LuUpload className="text-sm" />
        <span className="hidden md:block">
          {uploading ? "Uploading..." : "Upload Images"}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className="ml-1"
        >
          {isDropdownOpen ? <LuChevronUp className="text-sm" /> : <LuChevronDown className="text-sm" />}
        </button>
      </button>

      {/* Dropdown Card */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-slate-700">Images URL's for Content</h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {images.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                <LuImage className="mx-auto mb-2 text-2xl text-gray-300" />
                No images uploaded yet
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {images.map((image) => (
                  <div key={image._id} className="flex items-center gap-3 p-2 bg-gray-50/50 rounded border hover:bg-gray-50 transition-colors">
                    {/* Image Preview */}
                    <img
                      src={image.imageUrl}
                      alt={image.name}
                      className="w-12 h-12 object-cover rounded border"
                    />
                    
                    {/* Image Info */}
                    <div className="flex-1 min-w-0">
                      {editingId === image._id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-sky-500"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveEdit(image._id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(image._id)}
                            className="text-green-600 hover:text-green-700 p-1"
                            title="Save"
                          >
                            <LuSave className="text-xs" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Cancel"
                          >
                            <LuX className="text-xs" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-medium text-gray-800 truncate">{image.name}</p>
                          <p className="text-xs text-gray-500 truncate">{image.imageUrl}</p>
                          <p className="text-xs text-gray-400">{formatDate(image.createdAt)}</p>
                        </>
                      )}
                    </div>
                    
                    {/* Action Buttons */}
                    {editingId !== image._id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyToClipboard(image.imageUrl)}
                          className="text-sky-600 hover:text-sky-700 p-1.5 hover:bg-sky-50 rounded transition-colors"
                          title="Copy URL"
                        >
                          <LuCopy className="text-xs" />
                        </button>
                        <button
                          onClick={() => startEdit(image)}
                          className="text-gray-600 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="Edit Name"
                        >
                          <LuSave className="text-xs" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(image)}
                          className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                          title="Delete Image"
                        >
                          <LuTrash2 className="text-xs" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={closeDeleteModal}
        title="Delete Image"
      >
        <div className="w-[30vw]">
          <DeleteAlertContent
            content={`Are you sure you want to delete "${deleteModal.imageName}"? This action cannot be undone.`}
            onDelete={deleteImage}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ContentImageUploader;