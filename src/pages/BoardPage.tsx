import LoggedInName from "../LoginAndRegistry/components/LoggedInName";

const BoardPage = () => {
    return(
        <div className="container app-container py-3">
            <LoggedInName />
            <main>
                Board Page
            </main>
        </div>
    );
};

export default BoardPage;