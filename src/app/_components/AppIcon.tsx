interface AppIconProps {
  className?: string;
}

export default function AppIcon({ className = 'h-20' }: AppIconProps) {
  <svg viewBox='0 0 78 74' fill='none' xmlns='http://www.w3.org/2000/svg' className={'!aspect-[21/20] ' + className}>
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='M32.8534 74C50.9979 74 65.7069 59.291 65.7069 41.1465C65.7069 23.0021 50.9979 8.2931 32.8534 8.2931C14.709 8.2931 0 23.0021 0 41.1465C0 59.291 14.709 74 32.8534 74ZM32.8534 66.9828C47.1224 66.9828 58.6896 55.4155 58.6896 41.1465C58.6896 26.8776 47.1224 15.3103 32.8534 15.3103C18.5845 15.3103 7.01723 26.8776 7.01723 41.1465C7.01723 55.4155 18.5845 66.9828 32.8534 66.9828ZM57.4138 40.8276C68.688 40.8276 77.8276 31.688 77.8276 20.4138C77.8276 9.13957 68.688 0 57.4138 0C46.1396 0 37 9.13957 37 20.4138C37 31.688 46.1396 40.8276 57.4138 40.8276ZM57.4138 36.4674C66.2799 36.4674 73.4674 29.2799 73.4674 20.4138C73.4674 11.5477 66.2799 4.36022 57.4138 4.36022C48.5476 4.36022 41.3602 11.5477 41.3602 20.4138C41.3602 29.2799 48.5476 36.4674 57.4138 36.4674Z'
      fill='#CBA6F7'
    />
  </svg>;
}
