import TailwindAdvancedEditor from '@/components/screens/Sites/novel/NovelEditor';

const NovelEditorPage = () => {
  return (
    <div className='w-full flex justify-center items-center'>
      {/* <div className='fixed top-0 left-0 w-full h-full bg-black/50'>
        <img src='https://themoondevs.nyc3.cdn.digitaloceanspaces.com/novel-editor/656169ad1e031a6928ebd3ee/Spiderman%202%201600x900.jpg' className='w-full h-full object-cover' />
      </div> */}
      <div className='w-full h-screen flex justify-center items-center backdrop-blur-xl'>
        <div className='w-[50vw]  border-neutral-200 rounded-lg m-4'>
          <TailwindAdvancedEditor />
        </div>
      </div>
    </div>
  );
};

export default NovelEditorPage;
