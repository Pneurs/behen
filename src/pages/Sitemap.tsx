import { useEffect } from "react";

const Sitemap = () => {
  useEffect(() => {
    // Redirect to the edge function sitemap
    window.location.href = "https://xtoeehqcdfhxpdiasijc.supabase.co/functions/v1/sitemap";
  }, []);

  return null;
};

export default Sitemap;