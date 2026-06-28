import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "../lib/store.jsx";

export default function Toast() {
  const { toastMsg } = useApp();
  return (
    <AnimatePresence>
      {toastMsg && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 12, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 12, x: "-50%" }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        >
          {toastMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
