package com.group.suscrew.service;

import com.group.suscrew.model.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CrewService {

    private final GameConfig config;

    public CrewService(@Value("${suscrew.group-name}") String groupName,
                       @Value("${suscrew.ship-name}") String shipName,
                       @Value("${suscrew.impostor-id}") String impostorId) {

        List<CrewMember> crew = List.of(
            new CrewMember("m1", "Harley Balotro", "Sometimes Retarded", "#ff3b4e",
                "Pinili BSIT dahil magaling daw siya mag laro ng games sa computer",
                "Understanding and Loving, pero mahilig mag ragebait",
                List.of("Gaming", "Riding Motorcycles", "Basketball"),
                List.of("OA", "Pogi", "Mabaho yung Utot"),
                m1Stats(35, 75, 95),
                List.of("Kahit saan kayang tamae", "Professional Ragebaiter"),
                List.of("Poor asian boy", "Coding sa papel"),
                List.of(
                    "Kaya ko mag Wheelie ng motor",
                    "I can build 3x3 rubiks cube under 1 minute",
                    "I love lego, my whole room is lego"
                ),
                List.of("I am a nerd", "I can be your vibes"),
                "THE MASTER OF DISASTER OF SAMPALOC MANILA",
                "wiring",
                "gagi men, maawa kayo! hindi ako yun ngl",
                ""
            ),
            new CrewMember("m2", "Member Two", "Blue Screen", "#3d7bff",
                "Chief Swipe Officer",
                "Calm, clever and mildly allergic to mornings. Crashes at the worst moments.",
                List.of("Coding", "Anime marathons", "Collecting keyboards"),
                List.of("Debugging", "Speed typing", "Card swiping (4th attempt)"),
                stats(92, 30, 60, 55),
                List.of("Solves problems quietly", "Always has a charger"),
                List.of("Needs 4 swipes for everything", "Replies 3 days later"),
                List.of("Has never swiped a card successfully on the first try.", "Knows 11 keyboard shortcuts nobody asked about."),
                List.of("\"Have you tried turning it off and on?\"", "\"It works on my laptop.\""),
                "Guards the Admin room and its cursed card reader.",
                "swipe",
                "Admin saw me. I swiped four times. FOUR. Check the logs!", ""),
            new CrewMember("m3", "Member Three", "Trash Panda", "#3ddc84",
                "Waste Disposal Engineer",
                "Chaotic good. Finds treasure in everything, especially other people's snacks.",
                List.of("Thrifting", "Midnight snacking", "Skateboarding"),
                List.of("Improvisation", "Dumpster diving (academic)", "Cheering people up"),
                stats(60, 95, 80, 70),
                List.of("Fearless", "Makes everyone laugh"),
                List.of("Loses things constantly", "Eats first, asks later"),
                List.of("Can fit 14 snacks in one backpack.", "Has named every pigeon on campus."),
                List.of("\"That was mine!\"", "\"It is a feature, not a bug.\""),
                "Keeps the ship tidy. Mostly.",
                "garbage",
                "I was in Storage up to my elbows in leaves. Not sus. Smelly, but not sus.", ""),
            new CrewMember("m4", "Member Four", "Buffering", "#ffd23f",
                "Upload Specialist",
                "Mysterious, sleepy and always at 99%. Nobody knows what they are doing, including them.",
                List.of("Napping", "Mystery novels", "Staring at loading bars"),
                List.of("Looking busy", "Last-minute heroics", "Vanishing during meetings"),
                stats(70, 85, 20, 60),
                List.of("Brilliant under pressure", "Great poker face"),
                List.of("Procrastinates professionally", "Says \"almost done\" way too often"),
                List.of("Has been \"almost done\" since the first week.", "Once uploaded a file called FINAL_FINAL_v7_REAL."),
                List.of("\"Uploading...\"", "\"I swear I sent it.\""),
                "Responsible for uploading everything. Eventually.",
                "upload",
                "It is 99% uploaded! Why is everyone staring at me?",
                "Reason: has been \"almost done\" since the beginning of the semester.")
        );

        List<TaskInfo> tasks = List.of(
            new TaskInfo("wiring", "Fix Wiring", "Electrical", "⚡", "Drag each plug to the wire of the same color.", 5, 4, "m1"),
            new TaskInfo("swipe", "Swipe Card", "Admin", "💳", "Drag the card across the reader. Not too fast, not too slow.", 32, 4, "m2"),
            new TaskInfo("garbage", "Empty Garbage", "Storage", "🗑️", "Pull the lever down and hold it until the chute is empty.", 5, 16, "m3"),
            new TaskInfo("upload", "Upload Data", "MedBay", "☁️", "Press Upload. If the connection drops, squash the glitches.", 29, 18, "m4"),
            new TaskInfo("nav", "Align Navigation", "Navigation", "🧭", "Drag the marker onto the moving target and keep it locked.", 17, 21, null)
        );

        List<ClueInfo> clues = List.of(
            new ClueInfo("c1", "Cafeteria", "A half-eaten sandwich labelled \"NOT MINE\". The crumbs are suspiciously punctual.", 15, 13),
            new ClueInfo("c2", "Electrical", "A sticky note: \"I will do my part tomorrow.\" It is dated three weeks ago.", 7, 9),
            new ClueInfo("c3", "Storage", "A folder named FINAL_FINAL_v7 containing exactly one blank slide.", 6, 13),
            new ClueInfo("c4", "Admin", "Group chat log: \"Almost done!!\" Last seen online at 3:00 AM.", 28, 9)
        );

        this.config = new GameConfig(groupName, shipName, impostorId, tasks, clues, crew);
    }

    private static Map<String, Integer> m1Stats(int brains, int speed, int snacks) {
        Map<String, Integer> m = new LinkedHashMap<>();
        m.put("Brains", brains);
        m.put("Speed", speed);
        m.put("Snack Power", snacks);
        return m;
    }

    private static Map<String, Integer> stats(int brains, int chaos, int speed, int snacks) {
        Map<String, Integer> m = new LinkedHashMap<>();
        m.put("Brains", brains);
        m.put("Chaos", chaos);
        m.put("Speed", speed);
        m.put("Snack Power", snacks);
        return m;
    }

    public GameConfig getConfig() { return config; }

    public List<CrewMember> getCrew() { return config.crew(); }

    public Optional<CrewMember> findById(String id) {
        return config.crew().stream().filter(m -> m.id().equals(id)).findFirst();
    }
}
