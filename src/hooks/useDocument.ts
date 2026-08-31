import { DocumentContext } from "../components/DocumentContext.js";
import { useContext } from "react";

const useDocument = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocument must be used within a DocumentProvider");
  }
  return context;
};

export default useDocument;
