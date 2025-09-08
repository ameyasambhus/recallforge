import { Brain } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background-secondary py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className=" pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2025 RecallForge. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/terms" className="hover:text-primary transition-colors">
              Terms
            </a>
            <a href="/privacy" className="hover:text-primary transition-colors">
              Privacy
            </a>
            <a href="/cookies" className="hover:text-primary transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
