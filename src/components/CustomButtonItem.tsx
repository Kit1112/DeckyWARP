// src/components/CustomButtonItem.tsx
import React from "react";
import { Focusable } from "decky-frontend-lib";

export const CustomButtonItem = ({
  onClick,
  children,
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => {
  const baseStyle: React.CSSProperties = {
    backgroundColor: disabled ? "rgb(30, 34, 36)" : "rgb(43, 51, 55)",
    color: disabled ? "rgba(255, 255, 255, 0.4)" : "white",
    fontSize: "16px",
    fontWeight: "normal",
    padding: "10px 28px",
    cursor: disabled ? "default" : "pointer",
    userSelect: "none",
    borderRadius: "2px",
    display: "inline-block",
    lineHeight: 1.25,
    transition: "background-color 0.2s, color 0.2s",
    pointerEvents: disabled ? "none" : "auto",
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) e.currentTarget.style.backgroundColor = "rgb(57, 65, 69)";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      e.currentTarget.style.backgroundColor = "rgb(43, 51, 55)";
      e.currentTarget.style.color = "white";
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      e.currentTarget.style.backgroundColor = "rgb(108, 113, 116)";
      e.currentTarget.style.color = "rgb(43, 51, 55)";
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled) {
      e.currentTarget.style.backgroundColor = "rgb(57, 65, 69)";
      e.currentTarget.style.color = "white";
    }
  };

  return (
    <Focusable
      onActivate={!disabled ? onClick : undefined}
    >
      <div
        onClick={!disabled ? onClick : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        style={baseStyle}
      >
        {children}
      </div>
    </Focusable>
  );
};
