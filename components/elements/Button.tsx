export const GreyButton = ({
  children,
  rightIcon,
  leftIcon,
  ...props
}: {
  children: React.ReactNode;
  rightIcon?: string;
  leftIcon?: string;
} & any) => {
  return (
    <button
      {...props}
      className="group flex flex-row gap-3 mt-4 bg-neutral-800 hover:bg-neutral-700 text-white py-2 px-5 rounded-lg shadow-md"
    >
      {leftIcon && (
        <span className="material-icons text-neutral-500 group-hover:text-white">
          {leftIcon || "chevron_left"}
        </span>
      )}
      {children}
      {rightIcon && (
        <span className="material-icons text-neutral-500 group-hover:text-white">
          {rightIcon || "chevron_right"}
        </span>
      )}
    </button>
  );
};
