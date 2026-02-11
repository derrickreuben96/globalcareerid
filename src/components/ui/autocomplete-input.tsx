import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onValueChange?: (value: string) => void;
  showCopy?: boolean;
  icon?: React.ReactNode;
}

export function AutocompleteInput({
  suggestions,
  onValueChange,
  showCopy = false,
  icon,
  className,
  value,
  onChange,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState(value?.toString() || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputValue(value?.toString() || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(newValue.toLowerCase())
      ).slice(0, 8);
      setFilteredSuggestions(filtered);
      setIsOpen(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setIsOpen(false);
    }
    
    setHighlightedIndex(-1);
    onChange?.(e);
    onValueChange?.(newValue);
  };

  const handleSelect = (suggestion: string) => {
    setInputValue(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    // Create a synthetic event to pass to onChange
    const syntheticEvent = {
      target: { value: suggestion },
      currentTarget: { value: suggestion }
    } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(syntheticEvent);
    onValueChange?.(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && inputValue.length > 0) {
        const filtered = suggestions.filter(s => 
          s.toLowerCase().includes(inputValue.toLowerCase())
        ).slice(0, 8);
        setFilteredSuggestions(filtered);
        setIsOpen(filtered.length > 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inputValue);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length > 0) {
              const filtered = suggestions.filter(s => 
                s.toLowerCase().includes(inputValue.toLowerCase())
              ).slice(0, 8);
              setFilteredSuggestions(filtered);
              setIsOpen(filtered.length > 0);
            }
          }}
          className={cn(
            icon && "pl-10",
            showCopy && "pr-20",
            className
          )}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showCopy && inputValue && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-verified" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 py-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                highlightedIndex === index && "bg-accent text-accent-foreground"
              )}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
