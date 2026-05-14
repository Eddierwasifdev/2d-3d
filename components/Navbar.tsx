import {Box} from "lucide-react";
import Button from "./ui/Button";
import {useOutletContext} from "react-router";

const Navbar = () => {
    const { isSignedIn, userName, signIn, signOut } = useOutletContext<AuthContext>()

    const handleAuthClick = async () => {
        if(isSignedIn) {
            try {
                await signOut();
            } catch (e) {
                console.error(`Puter sign out failed: ${e}`);
            }

            return;
        }

        try {
            await signIn();
        } catch (e) {
            console.error(`Puter sign in failed: ${e}`);
        }
    };

    return (
        <header className="sticky top-4 z-50 mx-auto w-[95%] max-w-5xl rounded-full border border-white/10 bg-slate-800/80 backdrop-blur-md shadow-lg">
            <div className="flex h-14 items-center justify-between px-6">
                <div className="mr-4 flex">
                    <a href="/" className="mr-6 flex items-center space-x-2">
                        <Box className="h-6 w-6 text-foreground" />
                        <span className="hidden font-bold sm:inline-block text-foreground">
                            2d-3d
                        </span>
                    </a>
                    <nav className="flex items-center gap-4 text-sm lg:gap-6">
                        <a href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Product</a>
                        <a href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Pricing</a>
                        <a href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Community</a>
                        <a href="#" className="transition-colors hover:text-foreground/80 text-foreground/60">Enterprise</a>
                    </nav>
                </div>

                <div className="flex flex-1 items-center justify-end space-x-2">
                    <nav className="flex items-center space-x-2">
                        {isSignedIn ? (
                            <>
                                <span className="text-sm font-medium mr-4 text-foreground/80 hidden sm:inline-block">
                                    {userName ? `Hi, ${userName}` : 'Signed in'}
                                </span>

                                <button onClick={handleAuthClick} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                                    Log Out
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleAuthClick} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3">
                                    Log In
                                </button>

                                <a href="#upload" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
                                    Get Started
                                </a>
                            </>
                        )}
                    </nav>
                </div>
            </div>
        </header>
    )
}

export default Navbar
