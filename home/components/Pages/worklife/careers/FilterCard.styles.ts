import styled from "@emotion/styled";
import media from "@/styles/media";

export const FilterCardStyled = styled.div`
  width: 239px;
  height: 239px;
  padding: 0.25rem;
  border: 1px solid hsla(0, 0%, 100%, .05);
  border-radius: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background-color: hsla(0, 0%, 100%, .01);

  ${media.largeMobile} {
    width: 100%; 
  }

  & .department_btn{
    width: 100%;
    padding: 0px 1rem;
    border-radius: 20px;
    overflow: hidden;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex:1 ;
    border: 1px solid hsla(0, 0%, 100%, .05);
    background-color: hsla(0, 0%, 100%, .05);
    cursor: pointer;
    color: #ababab;
    font-size: 0.8rem;
      text-transform: uppercase;

    &:hover{
      background-color:hsla(0, 0%, 100%, 0.15);
    }
  }

  & .department_btn.active {
    background-color: hsla(0, 0%, 100%, 0.25);
    font-weight: 600;
  }

  & .filter_container{
    flex:1;
    
    & .filter_box{
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 0.2rem;
    }

    .switch_button {
      padding: 0.125rem 0.125rem;
      will-change: transform;
      cursor: pointer;
      transition: .3s ease all;
      border: 1px solid hsla(0, 0%, 100%, .01);
      border-radius: 50px;
      background-color: hsla(0, 0%, 100%, .1);
      flex:2;   

    .switch-button-case {
      display: inline-block;
      background: transparent;
      width: 49%;
      height: 100%;
      color: #ababab;
      position: relative;
      border: none;
      transition: .3s ease all;
      border-radius: 50%;
      font-size: 0.5rem;
      &:hover {
        color: gray;
        cursor: pointer;
      }

      &:focus {
        outline: none;
      }

      & .material-symbols-outlined{
        font-size: 1rem;
      } 
  }

  .active-case {
      color: #fff;
      background-color: rgba(255,255,255,0.2);
      width: 50%;
      height: 100%;
      z-index: -1;
      transition: .3s ease-out all;
      border-radius: 50px;
      }
    }
  }


  & .text_show_hide_button{
    display: flex;
    justify-content: center;
    align-items: center;
    flex:0.5;
    color: #ababab;
    font-size: 0.8rem;
    cursor: pointer;
    background-color: hsla(0, 0%, 100%, .05);
    border: 1px solid hsla(0, 0%, 100%, .05);
    padding: 0px 1rem;
    border-radius: 50px;

    &:hover{
      background-color:hsla(0, 0%, 100%, 0.15);
    }
  }

  & .text_show_hide_button.active {
    background-color: hsla(0, 0%, 100%, 0.25);
    font-weight: 700;
  }

  & .back_btn{
    padding: 0px 1rem;
    border-radius: 20px;
    overflow: hidden;
    flex:2 ;
    border: 1px solid hsla(0, 0%, 100%, .05);
    background-color: hsla(0, 0%, 100%, .05);
    cursor: pointer;
    color: #adadad;
    font-size: 0.8rem;
    text-transform: uppercase;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover{
      background-color:hsla(0, 0%, 100%, 0.15);
    }
  }
`