'use client';

/* eslint-disable @next/next/no-img-element */

interface BMCButtonProps {
  className?: string;
}

export function BMCButton({ className }: BMCButtonProps) {
  return (
    <a 
      href="https://www.buymeacoffee.com/luffytaro" 
      target="_blank" 
      rel="noopener noreferrer"
      className={`${className} inline-block hover:opacity-90 transition-opacity`}
    >
      <img 
        src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=luffytaro&button_colour=FFDD00&font_colour=000000&font_family=Comic&outline_colour=000000&coffee_colour=ffffff" 
        alt="Buy me a coffee" 
        className="h-15" // Standard BMC button height
      />
    </a>
  );
}
