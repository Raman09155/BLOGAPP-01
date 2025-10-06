import React, { useState, useCallback, useMemo, useContext } from "react";
import { LuMessageCircleDashed } from "react-icons/lu";
import { PiHandsClapping } from "react-icons/pi";
import axiosInstance from "../../../utils/axiosInstance";
import { API_PATHS } from "../../../utils/apiPaths";
import { UserContext } from "../../../context/userContext";
import clsx from "clsx";

const LikeCommentButton = ({ postId, likes, comments, userHasLiked = false }) => {
    const { setOpenAuthForm } = useContext(UserContext);
    const [postLikes, setPostLikes] = useState(likes || 0);
    const [isLikedByUser, setIsLikedByUser] = useState(userHasLiked);
    const [liked, setLiked] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleLikeClick = useCallback(async () => {
        if (!postId || isLoading) return;
        
        setIsLoading(true);
        
        try {
            const response = await axiosInstance.post(API_PATHS.POSTS.LIKE(postId));

            if (response.data?.success) {
                setPostLikes(response.data.likes);
                setIsLikedByUser(response.data.isLiked);
                setLiked(true);

                // Reset animation after 500ms
                setTimeout(() => {
                    setLiked(false);
                }, 500);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                setOpenAuthForm(true);
            } else {
                console.error("Error:", error.response?.data?.message || error.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [postId, isLoading]);

    const buttonClasses = useMemo(() => clsx(
        "flex items-end gap-2 cursor-pointer transition-opacity duration-200",
        isLoading && "opacity-60 cursor-not-allowed"
    ), [isLoading]);

    const iconClasses = useMemo(() => clsx(
        "text-[22px] transition-transform duration-300",
        liked && "scale-125 text-cyan-500",
        isLikedByUser && "text-cyan-500"
    ), [liked, isLikedByUser]);
  return <div className="flex justify-center items-center h-screen">
    <div className="fixed bottom-8 right-8 px-6 py-3 bg-black text-white rounded-full shadow-lg flex items-center justify-center">
        <button
          className={buttonClasses}
          onClick={handleLikeClick}
          disabled={isLoading}
          title={isLikedByUser ? "Unlike this post" : "Like this post"}
        >
          <PiHandsClapping className={iconClasses} />
          <span className="text-base font-medium leading-4">{postLikes}</span>
        </button>

        <div className="h-6 w-px bg-gray-500 mx-5"></div>

        <button className="flex items-end gap-2">
            <LuMessageCircleDashed className="text-[22px]" />
            <span className="text-base font-medium leading-4">{comments}</span>
        </button>
    </div>
  </div>
};

export default LikeCommentButton;
