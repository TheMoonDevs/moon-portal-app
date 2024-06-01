import { CircularProgress } from '@mui/material'
import React from 'react'

const CircularLoader = ({size = 20, color = '#fff' }:{size?: number , color?: string}) => {
  return (
    <CircularProgress 
        size={size}
        sx={{
            color:color
        }}
    />
  )
}

export default CircularLoader