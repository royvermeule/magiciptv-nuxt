export type Category = {
  category_id: string;
  category_name: string;
  parent_id: number;
};

export type Stream = {
  stream_id: number;
  series_id?: number;
  name: string;
  stream_icon: string;
  cover?: string;
  category_id: string;
};
