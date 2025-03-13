import React from 'react';

interface StackItemProps {
  item: {
    name: string;
    img_url: string;
    id: string;
  };
  showText?: boolean;
  size?: number;
}

const StackItem: React.FC<StackItemProps> = ({
  item,
  showText = true,
  size = 40,
}) => {
  if (!item || !item.img_url) return null;

  return (
    <div className="flex flex-col items-center">
      <img
        src={item.img_url}
        alt={item.name}
        className="rounded-md"
        style={{ width: size, height: size }}
      />
      {showText && <p className="mt-1 text-sm font-medium">{item.name}</p>}
    </div>
  );
};

interface StackData {
  name: string;
  img_url: string;
  id: string;
  size?: number;
}
interface StackListProps {
  data: StackData[];
  showText?: boolean;
  itemsToShow?: {
    id: string;
    size: number;
  }[];

  size?: number;
}

const StackList: React.FC<StackListProps> = ({
  data,
  showText = true,
  size = 40,
  itemsToShow,
}) => {
  if (!data?.length) return null;

  const items = itemsToShow?.length
    ? data
        .filter((item) => itemsToShow.some((i) => i.id === item.id))
        .map((item) => ({
          ...item,
          size: itemsToShow.find((i) => i.id === item.id)?.size || size,
        }))
    : data;

  return items.map((item) => (
    <StackItem
      key={item.id}
      item={item}
      showText={showText}
      size={item.size || size}
    />
  ));
};

export default StackList;
