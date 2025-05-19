// src/components/CustomButtonItem.tsx
import React from "react";

export const CustomButtonItem = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => {
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = "rgb(57, 65, 69)";
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = "rgb(43, 51, 55)";
    e.currentTarget.style.color = "white";
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = "rgb(108, 113, 116)";
    e.currentTarget.style.color = "rgb(43, 51, 55)";
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = "rgb(57, 65, 69)";
    e.currentTarget.style.color = "white";
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={{
        backgroundColor: "rgb(43, 51, 55)",
        color: "white",
        fontSize: "16px",
        fontWeight: "normal",
        padding: "10px 28px",
        cursor: "pointer",
        userSelect: "none",
        borderRadius: "2px",
        display: "inline-block",
        lineHeight: 1.25,
        transition: "background-color 0.2s, color 0.2s",
      }}
    >
      {children}
    </div>
  );
};


// src/components/CustomTextBox.tsx
import React from "react";

export const CustomTextBox = ({
  label,
  content,
}: {
  label: string;
  content: string;
}) => (
  <div style={{ width: "100%" }}>
    <div
      style={{
        fontSize: "12px",
        color: "rgba(255, 255, 255, 0.5)",
        marginBottom: "4px",
      }}
    >
      {label}
    </div>
    <div
      style={{
        whiteSpace: "pre-wrap",
        backgroundColor: "rgb(30, 34, 37)",
        color: "rgb(184, 188, 192)",
        padding: "10px",
        borderRadius: "4px",
      }}
    >
      {content}
    </div>
  </div>
);
