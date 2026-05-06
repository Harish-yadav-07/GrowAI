import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'
import { Button } from './ui/button';
import { ChevronDown, FileText, GraduationCap, LayoutDashboard, PenBox, StarsIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { checkUser } from '@/lib/checkUser';

const Header = async () => {
    await checkUser();
    return (
        <header className='fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-backdrop-filter:bg-background/60'>
            <nav className='container mx-auto px-4 h-16 flex items-center justify-between'>
                <Link href="/">
                    <Image src="/logo.png" alt="GrowAI Logo" width={200} height={60}
                        className='h-12 py-1 w-auto object-contain' />
                </Link>

                <div className='flex items-center space-x-2 md:space-x-4'>
                    <Show when="signed-in">
                        <Link href={"/insights"}>
                            <Button variant='outline'>
                                <LayoutDashboard className='h-4 w-4' />
                                <span className='hidden md:block'>Industry Insights</span>
                            </Button>
                        </Link>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <StarsIcon className='h-4 w-4' />
                                    <span className='hidden md:block'>Growth Tools</span>
                                    <ChevronDown className='h-4 w-4' />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <Link href={"/resume"} className='flex items-center gap-2'>
                                            <FileText className='h-4 w-4' />
                                            <span>Build Resume</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Link href={"/cover-letter"} className='flex items-center gap-2'>
                                            <PenBox className='h-4 w-4' />
                                            <span>Cover Letter</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Link href={"/interview"} className='flex items-center gap-2'>
                                            <GraduationCap className='h-4 w-4' />
                                            <span>Interview Prep</span>
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </Show>
                    <Show when="signed-out">
                        <SignInButton>
                            <Button variant='outline'>Sign In</Button>
                        </SignInButton>
                    </Show>
                    <Show when="signed-in">
                        <UserButton
                        afterSignOutUrl="/" 
                        />
                    </Show>
                </div>
            </nav>


        </header>
    )
}

export default Header;