import { useNavigate, useParams } from "react-router-dom";
import React, { useEffect, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import MDEditor, { commands } from "@uiw/react-md-editor";
import {
  LuLoader,
  LuLoaderCircle,
  LuSave,
  LuSend,
  LuSparkles,
  LuTrash,
  LuTrash2,
} from "react-icons/lu";
import axiosInstance from "../../utils/axiosinstance";
import { API_PATHS } from "../../utils/apiPaths";
import CoverImageSelector from "../../components/Inputs/CoverImageSelector";
import TagInput from "../../components/Inputs/TagInput";
import SkeletonLoader from "../../components/Loader/SkeletonLoader";
import BlogPostIdeaCard from "../../components/Cards/BlogPostIdeaCard";
import GenerateBlogPostForm from "./components/GenerateBlogPostForm";
import Modal from "../../components/Modal";
import uploadImage from "../../utils/uploadimage";
import toast from "react-hot-toast";
import { getToastMessagesByType } from "../../utils/helper";
import DeleteAlertContent from "../../components/DeleteAlertContent";
import ContentImageUploader from "../../components/ContentImageUploader";

const BlogPostEditor = ({ isEdit }) => {
  const navigate = useNavigate();
  const { postSlug = "" } = useParams();

  const [postData, setPostData] = useState({
    id: "",
    title: "",
    content: "",
    coverImageUrl: "",
    coverPreview: "",
    tags: "",
    isDraft: "",
    generatedByAI: false,
    // Meta Data Fields
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    customUrl: "",
    imageAltText: "",
    canonicalUrl: "",
  });

  const [postIdeas, setPostIdeas] = useState([]);
  const [contentImages, setContentImages] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [openBlogPostGenForm, setOpenBlogPostGenForm] = useState({
    open: false,
    data: null,
  });
  const [ideaLoading, setIdeaLoading] = useState(false);

  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  const handleValueChange = (key, value) => {
    setPostData((prevData) => ({ ...prevData, [key]: value }));
  };

  //Generate Blog Post Ideas Using AI
  const generatePostIdeas = async () => {
    setIdeaLoading(true);
    try {
      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_BLOG_POST_IDEAS,
        {
          topics: "React JS, Next JS, Node JS, React UI Components",
        }
      );
      const generatedIdeas = aiResponse.data;

      if (generatedIdeas?.length > 0) {
        setPostIdeas(generatedIdeas);
      }
    } catch (error) {
      console.log("Something went wrong. Please try again.", error);
    } finally {
      setIdeaLoading(false);
    }
  };

  // Fetch Content Images
  const fetchContentImages = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.CONTENT_IMAGES.GET_ALL);
      setContentImages(response.data);
    } catch (error) {
      console.error("Error fetching content images:", error);
    }
  };

  // Generate Meta Data Using AI
  const generateMetaData = async () => {
    if (!postData.title || !postData.content) {
      setError("Please add title and content first to generate meta data.");
      return;
    }

    setMetaLoading(true);
    setError("");
    try {
      const aiResponse = await axiosInstance.post(
        API_PATHS.AI.GENERATE_META_DATA,
        {
          title: postData.title,
          content: postData.content,
        }
      );
      const metaData = aiResponse.data;

      if (metaData) {
        setPostData((prevData) => ({
          ...prevData,
          metaTitle: metaData.metaTitle || "",
          metaDescription: metaData.metaDescription || "",
          metaKeywords: metaData.metaKeywords || "",
          customUrl: metaData.customUrl || "",
          imageAltText: metaData.imageAltText || "",
          canonicalUrl: metaData.canonicalUrl || "",
        }));
        toast.success("All SEO meta data generated successfully!");
      }
    } catch (error) {
      setError("Failed to generate meta data. Please try again.");
      console.log("Meta data generation error:", error);
    } finally {
      setMetaLoading(false);
    }
  };

  // Handle Blog Post Publish
  const handlePublish = async (isDraft) => {
    let coverImageUrl = "";

    if (!postData.title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!postData.content.trim()) {
      setError("Please enter some content.");
      return;
    }

    if (!isDraft) {
      if (!isEdit && !postData.coverImageUrl) {
        setError("Please select a cover image.");
        return;
      }
      if (isEdit && !postData.coverImageUrl && !postData.coverPreview) {
        setError("Please select a cover image.");
        return;
      }
      if (!postData.tags.length) {
        setError("Please add some tags.");
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      // Check if a new image was uploaded (file type)
      if (postData.coverImageUrl instanceof File) {
        const imgUploadRes = await uploadImage(postData.coverImageUrl);
        coverImageUrl = imgUploadRes.imageUrl || "";
      } else {
        coverImageUrl = postData.coverPreview;
      }

      const reqPayload = {
        title: postData.title,
        content: postData.content,
        coverImageUrl,
        tags: postData.tags,
        isDraft: isDraft ? true : false,
        generatedByAI: true,
        // Include meta data
        metaTitle: postData.metaTitle,
        metaDescription: postData.metaDescription,
        metaKeywords: postData.metaKeywords,
        customUrl: postData.customUrl,
        imageAltText: postData.imageAltText,
        canonicalUrl: postData.canonicalUrl,
      };

      const response = isEdit
        ? await axiosInstance.put(
            API_PATHS.POSTS.UPDATE(postData.id),
            reqPayload
          )
        : await axiosInstance.post(API_PATHS.POSTS.CREATE, reqPayload);

      if (response.data) {
        toast.success(
          getToastMessagesByType(
            isDraft ? "draft" : isEdit ? "edit" : "published"
          )
        );
        navigate("/admin/posts");
      }
    } catch (error) {
      setError("Failed to publish blog post. Please try again.");
      console.error("Error publishing blog post:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get Post Data By slug
  const fetchPostDetailsBySlug = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.POSTS.GET_BY_SLUG(postSlug)
      );

      if (response.data) {
        const data = response.data;

        setPostData((prevState) => ({
          ...prevState,
          id: data._id,
          title: data.title,
          content: data.content,
          coverPreview: data.coverImageUrl,
          tags: data.tags,
          isDraft: data.isDraft,
          generatedByAI: data.generatedByAI,
          // Load meta data
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
          metaKeywords: data.metaKeywords || "",
          customUrl: data.customUrl || "",
          imageAltText: data.imageAltText || "",
          canonicalUrl: data.canonicalUrl || "",
        }));
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Delete Blog Post
  const deletePost = async () => {
    try {
      await axiosInstance.delete(API_PATHS.POSTS.DELETE(postData.id));

      toast.success("Blog Post Deleted Successfully");
      setOpenDeleteAlert(false);
      navigate("/admin/posts");
    } catch (error) {
      console.error("Error deleting blog post:", error);
    }
  };

  useEffect(() => {
    if (isEdit) {
      fetchPostDetailsBySlug();
    } else {
      generatePostIdeas();
    }
    fetchContentImages();

    return () => {};
  }, []);
  return (
    <DashboardLayout activeMenu="Blog Posts">
      <div className="my-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 my-4">
          <div className="form-card p-6 col-span-12 md:col-span-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg font-medium">
                {!isEdit ? "Add New Post" : "Edit Post"}
              </h2>

              <div className="flex items-center gap-3">
                {isEdit && (
                  <button
                    className="flex items-center gap-2.5 text-[13px] font-medium text-rose-500 bg-rose-50/60 rounded px-1.5 md:px-3 py-1 md:py-[3px] border border-rose-50 hover:border-rose-300 cursor-pointer hover:scale-[1.02] transition-all"
                    disabled={loading}
                    onClick={() => setOpenDeleteAlert(true)}
                  >
                    <LuTrash2 className="text-sm" />{" "}
                    <span className="hidden md:block">Delete</span>
                  </button>
                )}

                <ContentImageUploader 
                  images={contentImages} 
                  setImages={setContentImages} 
                />

                <button
                  className="flex items-center gap-2.5 text-[13px] font-medium text-sky-500 bg-sky-50/60 rounded px-1.5 md:px-3 py-1 md:py-[3px] border border-sky-100 hover:border-sky-400 cursor-pointer hover:scale-[1.02] transition-all"
                  disabled={loading}
                  onClick={() => handlePublish(true)}
                >
                  <LuSave className="text-sm" />{" "}
                  <span className="hidden md:block">Save as Draft</span>
                </button>

                <button
                  className="flex items-center gap-2.5 text-[13px] font-medium text-sky-600 hover:text-white hover:bg-linear-to-r hover:from-sky-500 hover:to-indigo-500 rounded px-3 py-[3px] border border-sky-500 hover:border-sky-50 cursor-pointer transition-all"
                  disabled={loading}
                  onClick={() => handlePublish(false)}
                >
                  {loading ? (
                    <LuLoaderCircle className="animate-spin text-[15px]" />
                  ) : (
                    <LuSend className="text-sm" />
                  )}{" "}
                  Publish
                </button>
              </div>
            </div>

            {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}

            <div className="mt-4">
              <label className="text-xs font-medium text-slate-600">
                Post Title
              </label>

              <input
                placeholder="How to Build a MERN App"
                className="form-input"
                value={postData.title}
                onChange={({ target }) =>
                  handleValueChange("title", target.value)
                }
              />
            </div>

            <div className="mt-4">
              <CoverImageSelector
                image={postData.coverImageUrl}
                setImage={(value) => handleValueChange("coverImageUrl", value)}
                preview={postData.coverPreview}
                setPreview={(value) => handleValueChange("coverPreview", value)}
              />
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">
                Content
              </label>

              <div data-color-mode="light" className="mt-3">
                <MDEditor
                  value={postData.content}
                  onChange={(data) => {
                    handleValueChange("content", data);
                  }}
                  commands={[
                    commands.bold,
                    commands.italic,
                    commands.strikethrough,
                    commands.hr,
                    commands.title,
                    commands.divider,
                    commands.link,
                    commands.code,
                    commands.image,
                    commands.unorderedListCommand,
                    commands.orderedListCommand,
                    commands.checkedListCommand,
                  ]}
                  hideMenu={true}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-medium text-slate-600">Tags</label>

              <TagInput
                tags={postData?.tags || []}
                setTags={(data) => {
                  handleValueChange("tags", data);
                }}
              />
            </div>

            {/* Meta Data Section */}
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">SEO Meta Data</h3>
                <button
                  type="button"
                  className="flex items-center gap-2 text-[13px] font-medium text-purple-600 bg-purple-50/60 rounded px-3 py-1 border border-purple-100 hover:border-purple-400 cursor-pointer hover:scale-[1.02] transition-all"
                  disabled={metaLoading || !postData.title || !postData.content}
                  onClick={generateMetaData}
                >
                  {metaLoading ? (
                    <LuLoaderCircle className="animate-spin text-sm" />
                  ) : (
                    <LuSparkles className="text-sm" />
                  )}
                  {metaLoading ? "Generating..." : "Generate with AI"}
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600">Meta Title</label>
                  <input
                    placeholder="SEO optimized title (50-60 characters)"
                    className="form-input"
                    maxLength="60"
                    value={postData.metaTitle}
                    onChange={({ target }) => handleValueChange("metaTitle", target.value)}
                  />
                  <small className="text-xs text-gray-500">{postData.metaTitle.length}/60 characters</small>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-600">Meta Description</label>
                  <textarea
                    placeholder="Brief description for search engines (150-160 characters)"
                    className="form-input resize-none"
                    rows="3"
                    maxLength="160"
                    value={postData.metaDescription}
                    onChange={({ target }) => handleValueChange("metaDescription", target.value)}
                  />
                  <small className="text-xs text-gray-500">{postData.metaDescription.length}/160 characters</small>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-600">Meta Keywords</label>
                  <input
                    placeholder="SEO keywords (comma separated)"
                    className="form-input"
                    value={postData.metaKeywords}
                    onChange={({ target }) => handleValueChange("metaKeywords", target.value)}
                  />
                  <small className="text-xs text-gray-500">Separate keywords with commas</small>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-600">Custom URL</label>
                  <input
                    placeholder="custom-url-slug (optional)"
                    className="form-input"
                    value={postData.customUrl}
                    onChange={({ target }) => handleValueChange("customUrl", target.value)}
                  />
                  <small className="text-xs text-gray-500">Leave empty to auto-generate from title</small>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-600">Image Alt Text</label>
                  <input
                    placeholder="Descriptive text for cover image"
                    className="form-input"
                    value={postData.imageAltText}
                    onChange={({ target }) => handleValueChange("imageAltText", target.value)}
                  />
                  <small className="text-xs text-gray-500">Improves accessibility and SEO</small>
                </div>
                
                <div>
                  <label className="text-xs font-medium text-slate-600">Canonical URL</label>
                  <input
                    placeholder="https://example.com/canonical-url (optional)"
                    className="form-input"
                    value={postData.canonicalUrl}
                    onChange={({ target }) => handleValueChange("canonicalUrl", target.value)}
                  />
                  <small className="text-xs text-gray-500">Prevents duplicate content issues</small>
                </div>
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="form-card col-span-12 md:col-span-4 p-0">
              <div className="flex items-center justify-between px-6 pt-6">
                <h4 className="text-sm md:text-base font-medium inline-flex items-center gap-2">
                  <span className="text-sky-600">
                    <LuSparkles />
                  </span>
                  Ideas for your next post
                </h4>

                <button
                  className="bg-linear-to-r from-sky-500 to-cyan-400 text-[13px] font-semibold text-white px-3 py-1 rounded hover:bg-black hover:text-white transition-colors cursor-pointer hover:shadow-2xl hover:shadow-sky-200"
                  onClick={() =>
                    setOpenBlogPostGenForm({ open: true, data: null })
                  }
                >
                  Generate New
                </button>
              </div>

              <div>
                {ideaLoading ? (
                  <div className="p-5">
                    <SkeletonLoader />
                  </div>
                ) : (
                  postIdeas.map((idea, index) => (
                    <BlogPostIdeaCard
                      key={`idea_${index}`}
                      title={idea.title || ""}
                      description={idea.description || ""}
                      tags={idea.tags || []}
                      tone={idea.tone || "casual"}
                      onSelect={() =>
                        setOpenBlogPostGenForm({ open: true, data: idea })
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={openBlogPostGenForm?.open}
        onClose={() => {
          setOpenBlogPostGenForm({ open: false, data: null });
        }}
        hideHeader
      >
        <GenerateBlogPostForm
          contentParams={openBlogPostGenForm?.data || null}
          setPostContent={(title, content) => {
            const postInfo = openBlogPostGenForm?.data || null;
            setPostData((prevState) => ({
              ...prevState,
              title: title || prevState.title,
              content: content,
              tags: postInfo?.tags || prevState.tags,
              generatedByAI: true,
            }));
            
            // Auto-generate meta data for AI generated posts after state update
            setTimeout(() => {
              if (title && content) {
                // Update state first, then generate meta data
                setPostData((currentState) => {
                  // Trigger meta generation after state is updated
                  setTimeout(() => generateMetaData(), 500);
                  return currentState;
                });
              }
            }, 500);
          }}
          handleCloseForm={() => {
            setOpenBlogPostGenForm({ open: false, data: null });
          }}
        />
      </Modal>

      <Modal
        isOpen={openDeleteAlert}
        onClose={() => {
          setOpenDeleteAlert(false);
        }}
        title="Delete Alert"
      >
        <div className="w-[30vw]">
          <DeleteAlertContent
            content="Are you sure you want to delete this blog post?"
            onDelete={() => deletePost()}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default BlogPostEditor;
