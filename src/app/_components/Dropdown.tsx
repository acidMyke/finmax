import { FocusEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { twMerge } from 'tailwind-merge';

type IdLabel = { id: string; label: string };

interface DropdownProps {
  options: string[] | IdLabel[];
  option?: string;
  onChange: (option: string) => void;
  classNames?: {
    detailsElement?: string;
    summaryElement?: string;
    ulElement?: string;
    liElement?: string;
  };
  addTrailingArrow?: boolean;
}

export function Dropdown({ options, option: option, onChange, classNames, addTrailingArrow = true }: DropdownProps) {
  const [selectedOption, setSelectedOption] = useState(
    option ?? (typeof options[0] === 'string' ? options[0]! : options[0]!.id),
  );
  const detailsRef = useRef<HTMLDetailsElement>(null);

  if (options.length === 0) {
    throw new Error('Dropdown must have at least one option');
  }

  useEffect(() => {
    setSelectedOption(option ?? (typeof options[0] === 'string' ? options[0]! : options[0]!.id));
  }, [option, options]);

  let { detailsElement, summaryElement, ulElement, liElement } = classNames || {};

  const onBlur: FocusEventHandler<HTMLDetailsElement> = useCallback(e => {
    if (!detailsRef.current?.contains(e.relatedTarget as Node)) {
      detailsRef.current?.open && detailsRef.current?.removeAttribute('open');
    }
  }, []);

  const selectedLabel = useMemo(() => {
    return typeof options[0] === 'string'
      ? selectedOption
      : (options as IdLabel[]).find(option => option.id === selectedOption)?.label;
  }, [options, selectedOption]);

  return (
    <details className={twMerge('group/dd dropdown', detailsElement)} onBlur={onBlur} ref={detailsRef}>
      <summary className={twMerge('btn btn-neutral', summaryElement)}>
        {selectedLabel}
        {addTrailingArrow && <FaChevronDown size={16} className='transition-transform group-open/dd:rotate-180' />}
      </summary>
      {options.length > 0 && (
        <ul className={twMerge('fancy-scrollbar menu dropdown-content', ulElement)}>
          {options.map(option => (
            <li
              key={typeof option === 'string' ? option : option.id}
              className={twMerge(liElement)}
              onClick={() => {
                setSelectedOption(typeof option === 'string' ? option : option.id);
                onChange(typeof option === 'string' ? option : option.id);
                detailsRef.current?.removeAttribute('open');
              }}
            >
              <button className='btn btn-ghost btn-sm'>{typeof option === 'string' ? option : option.label}</button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
