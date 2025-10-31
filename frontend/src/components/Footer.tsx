export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/60 dark:border-slate-800/60 shrink-0">
      {/* Mobile Footer - sm and below */}
      <div className="sm:hidden py-2 px-4 text-xs text-slate-600 dark:text-slate-400 text-center">
        <p>© {year} Barcai Technology. All rights reserved.</p>
      </div>

      {/* Desktop Footer - sm and above */}
      <div className="hidden sm:block py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px] text-sm text-slate-600 dark:text-slate-400 text-center">
          <p>
            © {year} Customer Success Copilot by Barcai Technology. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
