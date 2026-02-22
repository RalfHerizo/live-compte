import { useEffect, useMemo, useState } from "react";

export const usePagination = (items = [], options = {}) => {
  const { initialRowsPerPage = 20 } = options;

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;

  const effectiveRowsPerPage =
    rowsPerPage === "all" ? Math.max(totalItems, 1) : rowsPerPage;

  const totalPages =
    rowsPerPage === "all"
      ? 1
      : Math.max(1, Math.ceil(totalItems / effectiveRowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex =
    totalItems === 0 ? 0 : (currentPage - 1) * effectiveRowsPerPage;
  const endIndex = totalItems === 0 ? 0 : startIndex + effectiveRowsPerPage;

  const currentData = useMemo(
    () => safeItems.slice(startIndex, endIndex),
    [safeItems, startIndex, endIndex]
  );

  const displayStart = totalItems === 0 ? 0 : startIndex + 1;
  const displayEnd = Math.min(endIndex, totalItems);
  const showPaginationControls = totalItems > effectiveRowsPerPage;

  const resetPagination = () => {
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(value === "all" ? "all" : Number(value));
    setCurrentPage(1);
  };

  return {
    currentPage,
    setCurrentPage,
    rowsPerPage,
    handleRowsPerPageChange,
    totalItems,
    totalPages,
    currentData,
    displayStart,
    displayEnd,
    showPaginationControls,
    resetPagination,
  };
};
